import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { restaurantCreateSchema } from "@/lib/validations/restaurant";
import { Restaurant } from "@/models/Restaurant";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const restaurants = await Restaurant.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ restaurants });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const body = await request.json();
  const parsed = restaurantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.name);
  const duplicateCount = await Restaurant.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
  const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;

  const restaurant = await Restaurant.create({
    name: parsed.data.name,
    slug,
    tagline: parsed.data.tagline,
    gstRate: parsed.data.gstRate
  });

  return NextResponse.json({ restaurant }, { status: 201 });
}
