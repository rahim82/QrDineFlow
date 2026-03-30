import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { toMenuItemView } from "@/lib/pricing";
import { menuItemSchema } from "@/lib/validations/menu";
import { MenuItem } from "@/models/MenuItem";
export async function GET(request) {
    await connectToDatabase();
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurantId");
    const hideUnavailable = url.searchParams.get("hideUnavailable") === "true";
    const query = restaurantId ? { restaurantId } : {};
    const items = await MenuItem.find(query).sort({ category: 1, name: 1 }).lean();
    const mapped = items.map(toMenuItemView);
    return NextResponse.json({
        items: hideUnavailable ? mapped.filter((item) => item.isAvailable) : mapped
    });
}
export async function POST(request) {
    await connectToDatabase();
    const body = await request.json();
    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const created = await MenuItem.create(parsed.data);
    return NextResponse.json({ item: toMenuItemView(created.toObject()) }, { status: 201 });
}
