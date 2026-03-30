import { redirect } from "next/navigation";
import { RestaurantAdminPanel } from "@/components/admin/restaurant-admin-panel";
import { LogoutButton } from "@/components/shared/logout-button";
import { getSession } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        redirect("/login");
    }
    const data = await getAdminDashboardData();
    return (<main className="shell space-y-8 py-8">
      <section className="glass-card p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Admin control center</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Multi-restaurant oversight</h1>
            <p className="mt-2 max-w-3xl text-stone-600">
              This starter ships with one sample restaurant, but the data model supports multiple locations, managers,
              table fleets, menu catalogs, and payment streams under a shared admin role.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">{session.name}</span>
            <LogoutButton className="rounded-full border border-stone-200 px-4 py-2 text-sm disabled:opacity-60"/>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6">
          <p className="text-sm text-stone-500">Restaurants</p>
          <p className="mt-2 text-3xl font-semibold">{data.totals.restaurants}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-stone-500">Monthly GMV</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(data.totals.monthlySales)}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-stone-500">Managers</p>
          <p className="mt-2 text-3xl font-semibold">{data.totals.managers}</p>
        </div>
      </section>

      <RestaurantAdminPanel restaurants={data.restaurants}/>

      <section className="glass-card p-6">
        <h2 className="text-2xl font-semibold">Top menu movers</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {data.mostOrderedItems.map((item) => (<div key={item.name} className="rounded-3xl bg-stone-950 p-5 text-white">
              <p className="text-sm text-stone-400">Orders</p>
              <p className="mt-2 text-xl font-semibold">{item.name}</p>
              <p className="mt-4 text-3xl font-semibold">{item.quantity}</p>
            </div>))}
        </div>
      </section>
    </main>);
}
