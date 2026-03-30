import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createLoginResponse } from "@/lib/auth";
import { clearOtp, isOtpValid } from "@/lib/otp";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";

export async function POST(request) {
    await connectToDatabase();
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid OTP verification payload" }, { status: 400 });
    }

    const user = await User.findOne({ email: parsed.data.email });
    if (!user) {
        return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    if (!isOtpValid(user, parsed.data.otp)) {
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    clearOtp(user);
    await user.save();

    return createLoginResponse(user);
}
