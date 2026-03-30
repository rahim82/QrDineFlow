import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { Restaurant } from "@/models/Restaurant";
import { Table } from "@/models/Table";
export async function GET(request) {
    await connectToDatabase();
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurantId");
    if (!restaurantId) {
        return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
    }
    const tables = await Table.find({ restaurantId }).sort({ tableNumber: 1 }).lean();
    return NextResponse.json({ tables });
}
export async function POST(request) {
    await connectToDatabase();
    const body = (await request.json());
    const restaurant = await Restaurant.findById(body.restaurantId).lean();
    if (!restaurant) {
        return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    const qrCodeUrl = `${env.appUrl}/menu/${restaurant.slug}/${body.tableNumber}`;
    const existing = await Table.findOne({ restaurantId: body.restaurantId, tableNumber: body.tableNumber }).lean();
    if (existing) {
        return NextResponse.json({ error: "Table already exists" }, { status: 409 });
    }
    const table = await Table.create({
        restaurantId: body.restaurantId,
        tableNumber: body.tableNumber,
        seats: body.seats || 4,
        qrCodeUrl
    });
    return NextResponse.json({ table }, { status: 201 });
}
