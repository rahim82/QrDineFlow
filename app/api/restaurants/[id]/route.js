import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { restaurantUpdateSchema } from "@/lib/validations/restaurant";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Restaurant } from "@/models/Restaurant";
import { Table } from "@/models/Table";
import { User } from "@/models/User";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const body = await request.json();
  const parsed = restaurantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await Restaurant.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  if (existing.name !== parsed.data.name) {
    const baseSlug = slugify(parsed.data.name);
    const duplicateCount = await Restaurant.countDocuments({
      _id: { $ne: id },
      slug: new RegExp(`^${baseSlug}`)
    });
    existing.slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;
  }

  existing.name = parsed.data.name;
  existing.tagline = parsed.data.tagline;
  existing.gstRate = parsed.data.gstRate;
  await existing.save();

  return NextResponse.json({ restaurant: existing });
}

export async function DELETE(_request, { params }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const restaurant = await Restaurant.findById(id).lean();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  await Promise.all([
    MenuItem.deleteMany({ restaurantId: id }),
    Table.deleteMany({ restaurantId: id }),
    Order.deleteMany({ restaurantId: id }),
    Payment.deleteMany({ restaurantId: id }),
    User.deleteMany({ restaurantId: id, role: "manager" }),
    Restaurant.findByIdAndDelete(id)
  ]);

  return NextResponse.json({ ok: true });
}
