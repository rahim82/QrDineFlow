import { cookies } from "next/headers";

const apiBaseUrl = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

async function fetchBackend(path, init = {}) {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  const headers = new Headers(init.headers || {});

  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
}

async function fetchBackendJson(path, init = {}) {
  const response = await fetchBackend(path, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `Backend request failed for ${path}`);
  }

  return data;
}

export async function getAdminDashboardData() {
  return fetchBackendJson("/api/admin/dashboard");
}

export async function getManagerDashboardDataByRestaurantId(restaurantId) {
  const query = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : "";
  return fetchBackendJson(`/api/manager/dashboard${query}`);
}

export async function getMenuPageData(slug, tableNumber) {
  return fetchBackendJson(`/api/public/menu/${encodeURIComponent(slug)}/${encodeURIComponent(tableNumber)}`);
}
