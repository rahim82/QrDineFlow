"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RestaurantAdminPanel({ restaurants: initialRestaurants }) {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function handleCreate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setCreating(true);

    try {
      const response = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name")),
          tagline: String(formData.get("tagline"))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Restaurant could not be created");
        return;
      }

      setRestaurants((current) => [data.restaurant, ...current]);
      form.reset();
      startTransition(() => router.refresh());
      toast.success("Restaurant created successfully");
    } catch (error) {
      console.error("restaurant create error", error);
      toast.error("The restaurant create request failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(restaurant) {
    const name = window.prompt("Restaurant name", restaurant.name);
    if (!name) return;
    const tagline = window.prompt("Restaurant tagline", restaurant.tagline);
    if (!tagline) return;

    setEditingId(restaurant._id);
    try {
      const response = await fetch(`/api/restaurants/${restaurant._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Restaurant could not be updated");
        return;
      }

      setRestaurants((current) =>
        current.map((item) => (item._id === restaurant._id ? data.restaurant : item))
      );
      startTransition(() => router.refresh());
      toast.success("Restaurant updated successfully");
    } catch (error) {
      console.error("restaurant update error", error);
      toast.error("The restaurant update request failed");
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(restaurant) {
    const confirmed = window.confirm(
      `Delete ${restaurant.name}? This will also remove its manager accounts, tables, menu items, orders, and payments from the database.`
    );
    if (!confirmed) return;

    setEditingId(restaurant._id);
    try {
      const response = await fetch(`/api/restaurants/${restaurant._id}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Restaurant could not be deleted");
        return;
      }

      setRestaurants((current) => current.filter((item) => item._id !== restaurant._id));
      startTransition(() => router.refresh());
      toast.success("Restaurant deleted successfully");
    } catch (error) {
      console.error("restaurant delete error", error);
      toast.error("The restaurant delete request failed");
    } finally {
      setEditingId(null);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Add restaurant</h2>
          <span className="text-sm text-stone-500">{restaurants.length} total</span>
        </div>
        <form className="mt-6 grid gap-3" onSubmit={handleCreate}>
          <input
            name="name"
            placeholder="Restaurant name"
            className="rounded-2xl border border-stone-200 px-4 py-3"
            required
          />
          <textarea
            name="tagline"
            placeholder="Restaurant tagline"
            className="min-h-24 rounded-2xl border border-stone-200 px-4 py-3"
            required
          />
          <button
            disabled={creating}
            className="rounded-2xl bg-stone-950 px-4 py-3 text-white disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create restaurant"}
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Manage restaurants</h2>
          <span className="text-sm text-stone-500">Admin CRUD</span>
        </div>
        <div className="mt-6 space-y-3">
          {restaurants.length ? (
            restaurants.map((restaurant) => (
              <div key={restaurant._id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-stone-950">{restaurant.name}</p>
                    <p className="mt-1 text-sm text-stone-600">{restaurant.tagline}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                      <span className="rounded-full bg-white px-3 py-1">/{restaurant.slug}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEdit(restaurant)}
                      disabled={editingId === restaurant._id}
                      className="rounded-full border border-stone-200 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(restaurant)}
                      disabled={editingId === restaurant._id}
                      className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">No restaurants have been created yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
