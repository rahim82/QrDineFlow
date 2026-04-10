"use client";

import Image from "next/image";
import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export function ManagerControlPanelV2({ restaurantId, restaurantSlug, tables: initialTables, menu: initialMenu }) {
  const [tables, setTables] = useState(initialTables);
  const [menu, setMenu] = useState(initialMenu);
  const [addingTable, setAddingTable] = useState(false);
  const [addingMenu, setAddingMenu] = useState(false);
  const [uploadingMenuImage, setUploadingMenuImage] = useState(false);
  const [addMenuImagePreview, setAddMenuImagePreview] = useState("");
  const [activeQr, setActiveQr] = useState(null);
  const [loadingQr, setLoadingQr] = useState(null);
  const [downloadingQrPdf, setDownloadingQrPdf] = useState(false);
  const [editingTableId, setEditingTableId] = useState(null);
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [menuEditDraft, setMenuEditDraft] = useState(null);

  async function uploadMenuImage(file) {
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    const uploadResponse = await fetch("/api/uploads/menu-image", {
      method: "POST",
      body: uploadForm
    });
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(uploadData.error || "Image upload failed");
    }
    return uploadData;
  }

  function handleAddMenuImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setAddMenuImagePreview("");
      return;
    }
    setAddMenuImagePreview(URL.createObjectURL(file));
  }

  async function handleTableSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setAddingTable(true);

    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber: Number(formData.get("tableNumber")),
          seats: Number(formData.get("seats"))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Table could not be added");
        return;
      }

      setTables((current) => [...current, data.table].sort((a, b) => a.tableNumber - b.tableNumber));
      form.reset();
      toast.success("Table added successfully");
    } catch (error) {
      console.error("table create network error", error);
      toast.error("The table request could not reach the server");
    } finally {
      setAddingTable(false);
    }
  }

  async function handleMenuSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setAddingMenu(true);

    try {
      let imageUrl = String(formData.get("image")).trim();
      const imageFile = formData.get("imageFile");
      let imagePublicId;

      if (imageFile instanceof File && imageFile.size > 0) {
        setUploadingMenuImage(true);
        const uploadData = await uploadMenuImage(imageFile);
        imageUrl = uploadData.imageUrl;
        imagePublicId = uploadData.publicId;
      }

      if (!imageUrl) {
        throw new Error("Add an image URL or upload an image");
      }

      const response = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          category: String(formData.get("category")),
          name: String(formData.get("name")),
          description: String(formData.get("description")),
          price: Number(formData.get("price")),
          image: imageUrl,
          imagePublicId,
          status: formData.get("status"),
          tags: String(formData.get("tags"))
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          pricingRules: []
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error("Menu item could not be added");
        return;
      }

      setMenu((current) => [...current, data.item]);
      form.reset();
      setAddMenuImagePreview("");
      toast.success("Menu item added successfully");
    } catch (error) {
      console.error("menu create network error", error);
      toast.error(error.message || "The menu request could not reach the server");
    } finally {
      setUploadingMenuImage(false);
      setAddingMenu(false);
    }
  }

  async function handleQrPreview(tableNumber) {
    setLoadingQr(tableNumber);

    try {
      const response = await fetch(`/api/tables/qr?restaurantSlug=${restaurantSlug}&tableNumber=${tableNumber}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "QR could not be loaded");
        return;
      }

      setActiveQr({
        tableNumber,
        dataUrl: data.dataUrl,
        qrUrl: data.qrUrl
      });
    } catch (error) {
      console.error("qr preview error", error);
      toast.error("QR could not be loaded");
    } finally {
      setLoadingQr(null);
    }
  }

  async function handleQrPdfDownload() {
    if (!activeQr) return;

    setDownloadingQrPdf(true);
    try {
      const imageResponse = await fetch(activeQr.dataUrl);
      const imageBytes = await imageResponse.arrayBuffer();

      const pdf = await PDFDocument.create();
      const page = pdf.addPage([420, 595]);
      const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
      const qrImage = await pdf.embedPng(imageBytes);

      page.drawText("Table QR Code", {
        x: 40,
        y: 540,
        size: 24,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1)
      });

      page.drawText(`Table ${activeQr.tableNumber}`, {
        x: 40,
        y: 510,
        size: 16,
        font: boldFont,
        color: rgb(0.4, 0.2, 0.05)
      });

      page.drawText("Customers can scan this QR code to open the menu instantly.", {
        x: 40,
        y: 488,
        size: 11,
        font: regularFont,
        color: rgb(0.35, 0.35, 0.35)
      });

      page.drawImage(qrImage, {
        x: 85,
        y: 180,
        width: 250,
        height: 250
      });

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `table-${activeQr.tableNumber}-qr.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success("QR PDF downloaded successfully");
    } catch (error) {
      console.error("qr pdf download error", error);
      toast.error("QR PDF could not be downloaded");
    } finally {
      setDownloadingQrPdf(false);
    }
  }

  async function handleTableEdit(table) {
    const tableNumber = window.prompt("New table number", String(table.tableNumber));
    if (!tableNumber) return;

    const seats = window.prompt("Seats", String(table.seats));
    if (!seats) return;

    setEditingTableId(table._id);
    try {
      const response = await fetch(`/api/tables/${table._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: Number(tableNumber),
          seats: Number(seats)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Table could not be updated");
        return;
      }

      setTables((current) =>
        current
          .map((item) => (item._id === table._id ? data.table : item))
          .sort((a, b) => a.tableNumber - b.tableNumber)
      );
      toast.success("Table updated successfully");
    } catch (error) {
      console.error("table update error", error);
      toast.error("The table update request failed");
    } finally {
      setEditingTableId(null);
    }
  }

  async function handleTableDelete(table) {
    const confirmed = window.confirm(`Delete table ${table.tableNumber}?`);
    if (!confirmed) return;

    setEditingTableId(table._id);
    try {
      const response = await fetch(`/api/tables/${table._id}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Table could not be deleted");
        return;
      }

      setTables((current) => current.filter((item) => item._id !== table._id));
      if (activeQr?.tableNumber === table.tableNumber) {
        setActiveQr(null);
      }
      toast.success("Table deleted successfully");
    } catch (error) {
      console.error("table delete error", error);
      toast.error("The table delete request failed");
    } finally {
      setEditingTableId(null);
    }
  }

  async function handleMenuEdit(item) {
    setMenuEditDraft({
      _id: item._id,
      restaurantId,
      originalImage: item.image,
      originalImagePublicId: item.imagePublicId,
      name: item.name,
      category: item.category,
      description: item.description,
      price: String(item.price),
      image: item.image,
      imagePublicId: item.imagePublicId,
      status: item.status,
      tags: item.tags.join(", "),
      imageFile: null,
      previewUrl: item.image
    });
  }

  function handleEditDraftChange(field, value) {
    setMenuEditDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function handleEditDraftImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setMenuEditDraft((current) =>
      current
        ? {
            ...current,
            imageFile: file,
            previewUrl: URL.createObjectURL(file)
          }
        : current
    );
  }

  async function handleMenuEditSubmit(event) {
    event.preventDefault();
    if (!menuEditDraft) return;

    setEditingMenuId(menuEditDraft._id);
    try {
      let imageUrl = menuEditDraft.image.trim();
      let imagePublicId = menuEditDraft.imagePublicId;

      if (menuEditDraft.imageFile) {
        setUploadingMenuImage(true);
        const uploadData = await uploadMenuImage(menuEditDraft.imageFile);
        imageUrl = uploadData.imageUrl;
        imagePublicId = uploadData.publicId;
      } else if (imageUrl !== menuEditDraft.originalImage) {
        imagePublicId = undefined;
      }

      if (!imageUrl) {
        throw new Error("Add an image URL or upload an image");
      }

      const response = await fetch(`/api/menu/${menuEditDraft._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          name: menuEditDraft.name,
          category: menuEditDraft.category,
          description: menuEditDraft.description,
          price: Number(menuEditDraft.price),
          image: imageUrl,
          imagePublicId,
          status: menuEditDraft.status,
          tags: menuEditDraft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Menu item could not be updated");
        return;
      }

      setMenu((current) => current.map((entry) => (entry._id === menuEditDraft._id ? data.item : entry)));
      setMenuEditDraft(null);
      toast.success("Menu item updated successfully");
    } catch (error) {
      console.error("menu update error", error);
      toast.error(error.message || "The menu update request failed");
    } finally {
      setUploadingMenuImage(false);
      setEditingMenuId(null);
    }
  }

  async function handleMenuDelete(item) {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) return;

    setEditingMenuId(item._id);
    try {
      const response = await fetch(`/api/menu/${item._id}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Menu item could not be deleted");
        return;
      }

      setMenu((current) => current.filter((entry) => entry._id !== item._id));
      toast.success("Menu item deleted successfully");
    } catch (error) {
      console.error("menu delete error", error);
      toast.error("The menu delete request failed");
    } finally {
      setEditingMenuId(null);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Add tables</h2>
            <span className="text-sm text-stone-500">{tables.length} active</span>
          </div>
          <form className="mt-6 grid gap-3 sm:grid-cols-3" onSubmit={handleTableSubmit}>
            <input name="tableNumber" type="number" min="1" placeholder="Table no." className="rounded-2xl border border-stone-200 px-4 py-3" required />
            <input name="seats" type="number" min="1" placeholder="Seats" className="rounded-2xl border border-stone-200 px-4 py-3" required />
            <button disabled={addingTable} className="rounded-2xl bg-stone-950 px-4 py-3 text-white disabled:opacity-60">
              {addingTable ? "Adding..." : "Add table"}
            </button>
          </form>
          <div className="mt-6 space-y-3">
            {tables.map((table) => (
              <div key={table._id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Table {table.tableNumber}</p>
                    <p className="text-sm text-stone-500">
                      {table.seats} seats / {table.isOccupied ? "Occupied" : "Free"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleQrPreview(table.tableNumber)} className="rounded-full border border-stone-200 px-3 py-2 text-sm">
                      {loadingQr === table.tableNumber ? "Loading QR..." : "Show QR"}
                    </button>
                    <button onClick={() => handleTableEdit(table)} disabled={editingTableId === table._id} className="rounded-full border border-stone-200 px-3 py-2 text-sm disabled:opacity-50">
                      Edit
                    </button>
                    <button onClick={() => handleTableDelete(table)} disabled={editingTableId === table._id} className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-50">
                      Delete
                    </button>
                    <a href={table.qrCodeUrl} className="rounded-full bg-orange-500 px-3 py-2 text-sm text-white">
                      Open menu
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activeQr ? (
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Table {activeQr.tableNumber} QR</h2>
                <p className="mt-1 text-sm text-stone-500">Customers can scan this QR code to open the menu directly.</p>
              </div>
              <button onClick={() => setActiveQr(null)} className="rounded-full border border-stone-200 px-3 py-2 text-sm">
                Close
              </button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-4 rounded-[1.75rem] bg-stone-50 p-6">
              <Image
                src={activeQr.dataUrl}
                alt={`QR for table ${activeQr.tableNumber}`}
                width={260}
                height={260}
                unoptimized
                className="rounded-2xl border border-stone-200 bg-white p-3"
              />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleQrPdfDownload}
                  disabled={downloadingQrPdf}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 disabled:opacity-60"
                >
                  {downloadingQrPdf ? "Preparing PDF..." : "Download QR PDF"}
                </button>
                <a href={activeQr.qrUrl} target="_blank" rel="noreferrer" className="rounded-full bg-stone-950 px-4 py-2 text-sm text-white">
                  Open customer menu
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Add menu items</h2>
            <span className="text-sm text-stone-500">{menu.length} items</span>
          </div>
          <form className="mt-6 grid gap-3" onSubmit={handleMenuSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="name" placeholder="Item name" className="rounded-2xl border border-stone-200 px-4 py-3" required />
              <input name="category" placeholder="Category" className="rounded-2xl border border-stone-200 px-4 py-3" required />
            </div>
            <textarea name="description" placeholder="Description" className="min-h-24 rounded-2xl border border-stone-200 px-4 py-3" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="price" type="number" step="0.01" placeholder="Price" className="rounded-2xl border border-stone-200 px-4 py-3" required />
              <select name="status" className="rounded-2xl border border-stone-200 px-4 py-3" defaultValue="in_stock">
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </div>
            <input name="image" placeholder="Image URL (optional if uploading below)" className="rounded-2xl border border-stone-200 px-4 py-3" />
            <div className="grid gap-2">
              <label className="text-sm font-medium text-stone-700">Or upload image</label>
              <input name="imageFile" type="file" accept="image/*" onChange={handleAddMenuImageChange} className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-sm" />
            </div>
            {addMenuImagePreview ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-50 p-3">
                <p className="mb-3 text-sm font-medium text-stone-700">Image preview</p>
                <img src={addMenuImagePreview} alt="Menu upload preview" className="h-48 w-full rounded-2xl object-cover" />
              </div>
            ) : null}
            <input name="tags" placeholder="Tags comma separated" className="rounded-2xl border border-stone-200 px-4 py-3" />
            <button disabled={addingMenu} className="rounded-2xl bg-orange-500 px-4 py-3 font-medium text-white disabled:opacity-60">
              {addingMenu ? (uploadingMenuImage ? "Uploading image..." : "Adding...") : "Add menu item"}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-2xl font-semibold">Current menu</h2>
          <div className="mt-4 space-y-3">
            {menu.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-stone-500">
                    {item.category} / {item.isAvailable ? "In stock" : "Out of stock"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{formatCurrency(item.currentPrice)}</p>
                  <button onClick={() => handleMenuEdit(item)} disabled={editingMenuId === item._id} className="rounded-full border border-stone-200 px-3 py-2 text-sm disabled:opacity-50">
                    Edit
                  </button>
                  <button onClick={() => handleMenuDelete(item)} disabled={editingMenuId === item._id} className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {menuEditDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-950">Edit menu item</h2>
                <p className="mt-1 text-sm text-stone-500">Update details, replace the image, and preview changes before saving.</p>
              </div>
              <button type="button" onClick={() => setMenuEditDraft(null)} className="rounded-full border border-stone-200 px-3 py-2 text-sm">
                Close
              </button>
            </div>
            <form className="mt-6 grid gap-3" onSubmit={handleMenuEditSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={menuEditDraft.name} onChange={(event) => handleEditDraftChange("name", event.target.value)} placeholder="Item name" className="rounded-2xl border border-stone-200 px-4 py-3" required />
                <input value={menuEditDraft.category} onChange={(event) => handleEditDraftChange("category", event.target.value)} placeholder="Category" className="rounded-2xl border border-stone-200 px-4 py-3" required />
              </div>
              <textarea value={menuEditDraft.description} onChange={(event) => handleEditDraftChange("description", event.target.value)} placeholder="Description" className="min-h-24 rounded-2xl border border-stone-200 px-4 py-3" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={menuEditDraft.price} onChange={(event) => handleEditDraftChange("price", event.target.value)} type="number" step="0.01" placeholder="Price" className="rounded-2xl border border-stone-200 px-4 py-3" required />
                <select value={menuEditDraft.status} onChange={(event) => handleEditDraftChange("status", event.target.value)} className="rounded-2xl border border-stone-200 px-4 py-3">
                  <option value="in_stock">In stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </div>
              <input value={menuEditDraft.image} onChange={(event) => handleEditDraftChange("image", event.target.value)} placeholder="Image URL (optional if uploading below)" className="rounded-2xl border border-stone-200 px-4 py-3" />
              <div className="grid gap-2">
                <label className="text-sm font-medium text-stone-700">Or upload replacement image</label>
                <input type="file" accept="image/*" onChange={handleEditDraftImageChange} className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-sm" />
              </div>
              {menuEditDraft.previewUrl ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-50 p-3">
                  <p className="mb-3 text-sm font-medium text-stone-700">Image preview</p>
                  <img src={menuEditDraft.previewUrl} alt={menuEditDraft.name} className="h-56 w-full rounded-2xl object-cover" />
                </div>
              ) : null}
              <input value={menuEditDraft.tags} onChange={(event) => handleEditDraftChange("tags", event.target.value)} placeholder="Tags comma separated" className="rounded-2xl border border-stone-200 px-4 py-3" />
              <button disabled={editingMenuId === menuEditDraft._id} className="rounded-2xl bg-stone-950 px-4 py-3 font-medium text-white disabled:opacity-60">
                {editingMenuId === menuEditDraft._id ? (uploadingMenuImage ? "Uploading image..." : "Saving changes...") : "Save menu item"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
