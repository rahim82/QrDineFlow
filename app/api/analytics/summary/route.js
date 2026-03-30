import { NextResponse } from "next/server";
import { getAnalyticsSummary, getRestaurantBySlug } from "@/lib/data";
export async function GET(request) {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurantId");
    const slug = url.searchParams.get("slug");
    if (!restaurantId && !slug) {
        return NextResponse.json({ error: "restaurantId or slug is required" }, { status: 400 });
    }
    let resolvedRestaurantId = restaurantId;
    if (!resolvedRestaurantId && slug) {
        const restaurant = await getRestaurantBySlug(slug);
        resolvedRestaurantId =
            restaurant && !Array.isArray(restaurant) && restaurant._id ? String(restaurant._id) : null;
    }
    if (!resolvedRestaurantId) {
        return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    const summary = await getAnalyticsSummary(resolvedRestaurantId);
    return NextResponse.json({ summary });
}
