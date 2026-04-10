import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerControlPanelV2 } from "@/components/dashboard/manager-control-panel-v2";
import { LogoutButton } from "@/components/shared/logout-button";
import { getSession } from "@/lib/auth";
import { getManagerDashboardDataByRestaurantId } from "@/lib/data";

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

    return (
        <main className="shell space-y-8 py-8">
            <section className="relative overflow-hidden rounded-4xl bg-stone-950 p-8 text-white shadow-[0_30px_100px_rgba(28,25,23,0.22)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.2),transparent_30%),radial-gradient(circle_at_right,rgba(45,212,191,0.16),transparent_25%)]" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-orange-200">Manager dashboard</p>
                        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{data.restaurant.name}</h1>
                        <p className="mt-2 max-w-2xl text-stone-300">{data.restaurant.tagline}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/manager/operations"
                            className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10"
                        >
                            Open operations
                        </Link>
                        <span className="rounded-full bg-white px-4 py-2 text-stone-950">{session.name}</span>
                        <LogoutButton className="rounded-full border border-white/20 px-4 py-2 text-white disabled:opacity-60" />
                    </div>
                </div>
            </section>

            <ManagerControlPanelV2
                restaurantId={String(data.restaurant._id)}
                restaurantSlug={data.restaurant.slug}
                tables={data.tables.map((table) => ({
                    _id: String(table._id),
                    tableNumber: table.tableNumber,
                    seats: table.seats,
                    qrCodeUrl: table.qrCodeUrl,
                    isOccupied: Boolean(table.isOccupied),
                    activeOrderId: table.activeOrderId
                }))}
                menu={data.menu}
            />

            <section className="glass-card p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Operations view</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                            Live orders and analytics
                        </h2>
                        <p className="mt-2 max-w-2xl text-stone-600">
                            Open the separate operations page for sales overview, recent orders, and table performance.
                        </p>
                    </div>
                    <Link href="/manager/operations" className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white">
                        View operations
                    </Link>
                </div>
            </section>
        </main>
    );
}
