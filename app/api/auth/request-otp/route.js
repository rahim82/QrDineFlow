import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { sendOtpEmail, verifySmtpConnection } from "@/lib/mailer";
import { canRequestOtp, createOtpRecord, generateOtpCode } from "@/lib/otp";
import { requestOtpSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";

export async function POST(request) {
    try {
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

        let mailResult = { delivered: false, reason: "unknown" };
        try {
            const smtpCheck = await verifySmtpConnection();
            if (!smtpCheck.ok) {
                console.error("SMTP verification failed", {
                    reason: smtpCheck.reason,
                    message: smtpCheck.message
                });
            }
            mailResult = await sendOtpEmail({ email: user.email, otp });
            console.info("OTP email delivery result", {
                delivered: mailResult.delivered,
                messageId: mailResult.messageId,
                accepted: mailResult.accepted,
                rejected: mailResult.rejected
            });
        }
        catch (error) {
            console.error("OTP email delivery failed", {
                message: error?.message,
                code: error?.code,
                response: error?.response,
                responseCode: error?.responseCode,
                command: error?.command
            });
            mailResult = { delivered: false, reason: "smtp_failed" };
        }

        return NextResponse.json({
            message: mailResult.delivered
                ? "OTP sent to your email"
                : process.env.NODE_ENV === "production"
                    ? "OTP generated, but email delivery failed"
                    : "OTP generated. Email delivery failed, so use the OTP printed in the server terminal.",
            devOtp: mailResult.delivered || process.env.NODE_ENV === "production" ? undefined : otp
        });
    }
    catch (error) {
        console.error("POST /api/auth/request-otp failed", error);
        return NextResponse.json({ error: "The OTP request could not be completed" }, { status: 500 });
    }
}
