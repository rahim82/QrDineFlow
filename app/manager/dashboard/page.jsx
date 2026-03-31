import { redirect } from "next/navigation";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { ManagerControlPanelV2 } from "@/components/dashboard/manager-control-panel-v2";
import { ManagerLiveFeed } from "@/components/dashboard/manager-live-feed";
import { AdvancedOrderCard } from "@/components/dashboard/advanced-order-card";
import { LogoutButton } from "@/components/shared/logout-button";
import { getSession } from "@/lib/auth";
import { getManagerDashboardDataByRestaurantId } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function ManagerDashboardPage() {
    const session = await getSession();
    if (!session || session.role !== "manager" || !session.restaurantId) {
        redirect("/login");
    }
    const data = await getManagerDashboardDataByRestaurantId(session.restaurantId);
    if (!data) {
        return <main className="shell py-16">Restaurant data could not be found.</main>;
    }
    return (<main className="shell space-y-8 py-8">
      <ManagerLiveFeed restaurantId={String(data.restaurant._id)}/>
      <section className="relative overflow-hidden rounded-4xl bg-stone-950 p-8 text-white shadow-[0_30px_100px_rgba(28,25,23,0.22)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.2),transparent_30%),radial-gradient(circle_at_right,rgba(45,212,191,0.16),transparent_25%)]"/>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-orange-200">Manager dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{data.restaurant.name}</h1>
            <p className="mt-2 max-w-2xl text-stone-300">{data.restaurant.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-stone-950">{session.name}</span>
            <LogoutButton className="rounded-full border border-white/20 px-4 py-2 text-white disabled:opacity-60"/>
          </div>
        </div>
      </section>

      <ManagerControlPanelV2 restaurantId={String(data.restaurant._id)} restaurantSlug={data.restaurant.slug} tables={data.tables.map((table) => ({
            _id: String(table._id),
            tableNumber: table.tableNumber,
            seats: table.seats,
            qrCodeUrl: table.qrCodeUrl
        }))} menu={data.menu}/>

      <section className="glass-card p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Operations view</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Live orders and analytics</h2>
            <p className="mt-2 max-w-2xl text-stone-600">Kitchen flow, order details, and table performance appear here.</p>
          </div>
        </div>
      </section>

      <AnalyticsOverview summary={data.analytics}/>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent orders</h2>
            <span className="text-sm text-stone-500">{data.orders.length} recent</span>
          </div>
          <div className="mt-6 space-y-4">
            {data.orders.map((order) => (<AdvancedOrderCard key={String(order._id)} id={String(order._id)} tableNumber={order.tableNumber} customerName={order.customerName} itemCount={order.items.length} amount={formatCurrency(order.totalAmount)} status={order.status} createdAt={order.createdAt} items={order.items} splitParticipants={order.splitParticipants}/>))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-2xl font-semibold">Table performance</h2>
            <div className="mt-4 space-y-3">
              {data.analytics.tablePerformance.map((table) => (<div key={table.tableNumber} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <div>
                    <p className="font-medium">Table {table.tableNumber}</p>
                    <p className="text-sm text-stone-500">{table.orders} orders</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(table.revenue)}</p>
                </div>))}
            </div>
          </div>
        </div>
      </section>
    </main>);
}
