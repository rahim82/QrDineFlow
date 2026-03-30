"use client";
import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
export function ManagerControlPanel({ restaurantId, restaurantSlug, tables: initialTables, menu: initialMenu }) {
    const [tables, setTables] = useState(initialTables);
    const [menu, setMenu] = useState(initialMenu);
    const [addingTable, setAddingTable] = useState(false);
    const [addingMenu, setAddingMenu] = useState(false);
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
        }
        catch (error) {
            console.error("table create network error", error);
            toast.error("The table request could not reach the server");
        }
        finally {
            setAddingTable(false);
        }
    }
    async function handleMenuSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setAddingMenu(true);
        try {
            const response = await fetch("/api/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId,
                    category: String(formData.get("category")),
                    name: String(formData.get("name")),
                    description: String(formData.get("description")),
                    price: Number(formData.get("price")),
                    image: String(formData.get("image")),
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
            toast.success("Menu item added successfully");
        }
        catch (error) {
            console.error("menu create network error", error);
            toast.error("The menu request could not reach the server");
        }
        finally {
            setAddingMenu(false);
        }
    }
    return (<section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Add tables</h2>
            <span className="text-sm text-stone-500">{tables.length} active</span>
          </div>
          <form className="mt-6 grid gap-3 sm:grid-cols-3" onSubmit={handleTableSubmit}>
            <input name="tableNumber" type="number" min="1" placeholder="Table no." className="rounded-2xl border border-stone-200 px-4 py-3" required/>
            <input name="seats" type="number" min="1" placeholder="Seats" className="rounded-2xl border border-stone-200 px-4 py-3" required/>
            <button disabled={addingTable} className="rounded-2xl bg-stone-950 px-4 py-3 text-white disabled:opacity-60">
              {addingTable ? "Adding..." : "Add table"}
            </button>
          </form>
          <div className="mt-6 space-y-3">
            {tables.map((table) => (<div key={table._id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Table {table.tableNumber}</p>
                    <p className="text-sm text-stone-500">{table.seats} seats</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`/api/tables/qr?restaurantSlug=${restaurantSlug}&tableNumber=${table.tableNumber}`} className="rounded-full border border-stone-200 px-3 py-2 text-sm">
                      QR payload
                    </a>
                    <a href={table.qrCodeUrl} className="rounded-full bg-orange-500 px-3 py-2 text-sm text-white">
                      Open menu
                    </a>
                  </div>
                </div>
              </div>))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Add menu items</h2>
            <span className="text-sm text-stone-500">{menu.length} items</span>
          </div>
          <form className="mt-6 grid gap-3" onSubmit={handleMenuSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="name" placeholder="Item name" className="rounded-2xl border border-stone-200 px-4 py-3" required/>
              <input name="category" placeholder="Category" className="rounded-2xl border border-stone-200 px-4 py-3" required/>
            </div>
            <textarea name="description" placeholder="Description" className="min-h-24 rounded-2xl border border-stone-200 px-4 py-3" required/>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="price" type="number" step="0.01" placeholder="Price" className="rounded-2xl border border-stone-200 px-4 py-3" required/>
              <select name="status" className="rounded-2xl border border-stone-200 px-4 py-3" defaultValue="in_stock">
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </div>
            <input name="image" placeholder="Image URL" className="rounded-2xl border border-stone-200 px-4 py-3" required/>
            <input name="tags" placeholder="Tags comma separated" className="rounded-2xl border border-stone-200 px-4 py-3"/>
            <button disabled={addingMenu} className="rounded-2xl bg-orange-500 px-4 py-3 font-medium text-white disabled:opacity-60">
              {addingMenu ? "Adding..." : "Add menu item"}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-2xl font-semibold">Current menu</h2>
          <div className="mt-4 space-y-3">
            {menu.map((item) => (<div key={item._id} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-stone-500">
                    {item.category} • {item.isAvailable ? "In stock" : "Out of stock"}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.currentPrice)}</p>
              </div>))}
          </div>
        </div>
      </div>
    </section>);
}
