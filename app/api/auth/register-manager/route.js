import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { managerRegisterSchema } from "@/lib/validations/auth";
import { Restaurant } from "@/models/Restaurant";
import { User } from "@/models/User";
export async function POST(request) {
    await connectToDatabase();
    const body = await request.json();
    const parsed = managerRegisterSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const existingUser = await User.findOne({ email: parsed.data.email }).lean();
    if (existingUser) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const baseSlug = slugify(parsed.data.restaurantName);
    const duplicateCount = await Restaurant.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
    const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;
    const restaurant = await Restaurant.create({
        name: parsed.data.restaurantName,
        slug,
        tagline: parsed.data.tagline,
        gstRate: 0
    });
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await User.create({
        name: parsed.data.managerName,
        email: parsed.data.email,
        passwordHash,
        role: "manager",
        restaurantId: restaurant._id
    });
    restaurant.managerIds = [user._id];
    await restaurant.save();
    const token = signToken({
        id: String(user._id),
        role: "manager",
        restaurantId: String(restaurant._id),
        name: user.name,
        email: user.email
    });
    const response = NextResponse.json({
        user: {
            id: String(user._id),
            role: "manager",
            name: user.name,
            email: user.email
        },
        restaurant: {
            id: String(restaurant._id),
            slug: restaurant.slug,
            name: restaurant.name
        }
    });
    response.cookies.set("qr_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
    });
    return response;
}
