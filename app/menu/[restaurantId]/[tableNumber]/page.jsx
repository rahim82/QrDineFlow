import { notFound } from "next/navigation";
import { getMenuByRestaurantSlug, getTableByRestaurantAndNumber } from "@/lib/data";
import { MenuClient } from "@/components/menu/menu-client";
export const dynamic = "force-dynamic";
export default async function MenuPage({ params }) {
    const { restaurantId: slug, tableNumber } = await params;
    const { restaurant, menu } = await getMenuByRestaurantSlug(slug);
    if (!restaurant) {
        notFound();
    }
    const table = await getTableByRestaurantAndNumber(String(restaurant._id), Number(tableNumber));
    if (!table) {
        notFound();
    }
    return (<main className="shell py-8">
      <MenuClient restaurantId={String(restaurant._id)} restaurantName={restaurant.name} tableId={String(table._id)} tableNumber={table.tableNumber} menu={menu}/>
    </main>);
}
