import { notFound } from "next/navigation";
import { getMenuPageData } from "@/lib/data";
import { MenuClient } from "@/components/menu/menu-client";
export const dynamic = "force-dynamic";
export default async function MenuPage({ params }) {
    const { restaurantId: slug, tableNumber } = await params;
    let payload = null;
    try {
        payload = await getMenuPageData(slug, tableNumber);
    }
    catch {
        notFound();
    }
    const { restaurant, menu, table } = payload;
    if (!restaurant || !table) {
        notFound();
    }
    return (<main className="shell py-8">
      <MenuClient restaurantId={String(restaurant._id)} restaurantName={restaurant.name} tableId={String(table._id)} tableNumber={table.tableNumber} menu={menu}/>
    </main>);
}
