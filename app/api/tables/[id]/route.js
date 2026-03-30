import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { Restaurant } from "@/models/Restaurant";
import { Table } from "@/models/Table";

export async function PATCH(request, { params }) {
  await connectToDatabase();
  const { id } = await params;
  const body = await request.json();

  const table = await Table.findById(id).lean();
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const restaurant = await Restaurant.findById(table.restaurantId).lean();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const nextTableNumber = Number(body.tableNumber ?? table.tableNumber);
  const nextSeats = Number(body.seats ?? table.seats);

  const duplicate = await Table.findOne({
    restaurantId: table.restaurantId,
    tableNumber: nextTableNumber,
    _id: { $ne: id }
  }).lean();

  if (duplicate) {
    return NextResponse.json({ error: "Table number already exists" }, { status: 409 });
  }

  const updated = await Table.findByIdAndUpdate(id, {
    tableNumber: nextTableNumber,
    seats: nextSeats,
    qrCodeUrl: `${env.appUrl}/menu/${restaurant.slug}/${nextTableNumber}`
  }, { new: true }).lean();

  return NextResponse.json({ table: updated });
}

export async function DELETE(_, { params }) {
  await connectToDatabase();
  const { id } = await params;
  const deleted = await Table.findByIdAndDelete(id).lean();
  if (!deleted) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
