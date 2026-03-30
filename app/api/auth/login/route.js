import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createLoginResponse } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";
export async function POST(request) {
    await connectToDatabase();
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }
    const user = (await User.findOne({ email: result.data.email }).lean());
    if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const isValid = await bcrypt.compare(result.data.password, user.passwordHash);
    if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    return createLoginResponse(user);
}
