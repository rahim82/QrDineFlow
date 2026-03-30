import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { sendOtpEmail } from "@/lib/mailer";
import { canRequestOtp, createOtpRecord, generateOtpCode } from "@/lib/otp";
import { requestOtpSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";

export async function POST(request) {
    await connectToDatabase();
    const body = await request.json();
    const parsed = requestOtpSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid OTP request payload" }, { status: 400 });
    }

    const user = await User.findOne({ email: parsed.data.email });
    if (!user) {
        return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    if (!canRequestOtp(user)) {
        return NextResponse.json({ error: "Please wait a minute before requesting another OTP" }, { status: 429 });
    }

    const otp = generateOtpCode();
    Object.assign(user, createOtpRecord(otp));
    await user.save();

    console.info(`Login OTP for ${user.email}: ${otp}`);
    const mailResult = await sendOtpEmail({ email: user.email, otp });

    return NextResponse.json({
        message: mailResult.delivered
            ? "OTP sent to your email"
            : process.env.NODE_ENV === "production"
                ? "OTP generated, but email delivery is not configured"
                : "OTP generated successfully. Email is not configured, so check the terminal log in development.",
        devOtp: mailResult.delivered || process.env.NODE_ENV === "production" ? undefined : otp
    });
}
