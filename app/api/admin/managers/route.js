import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { adminCreateManagerSchema } from "@/lib/validations/auth";
import { Restaurant } from "@/models/Restaurant";
import { User } from "@/models/User";

export async function POST(request) {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();
    const parsed = adminCreateManagerSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const restaurant = await Restaurant.findById(parsed.data.restaurantId);
    if (!restaurant) {
        return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const existingUser = await User.findOne({ email: parsed.data.email }).lean();
    if (existingUser) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const manager = await User.create({
        name: parsed.data.managerName,
        email: parsed.data.email,
        passwordHash,
        role: "manager",
        restaurantId: restaurant._id
    });

    restaurant.managerIds = [...new Set([...(restaurant.managerIds || []).map((id) => String(id)), String(manager._id)])];
    await restaurant.save();

    return NextResponse.json({
        manager: {
            _id: String(manager._id),
            name: manager.name,
            email: manager.email,
            role: manager.role,
            restaurantId: String(restaurant._id)
        }
    }, { status: 201 });
}
