import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
export async function POST(request) {
    await connectToDatabase();
    const body = (await request.json());
    let verified = body.success ?? false;
    if (env.razorpayKeySecret && body.razorpayPaymentId && body.razorpaySignature) {
        const generated = crypto
            .createHmac("sha256", env.razorpayKeySecret)
            .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
            .digest("hex");
        verified = generated === body.razorpaySignature;
    }
    const payment = await Payment.findByIdAndUpdate(body.paymentId, {
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: body.razorpayPaymentId,
        status: verified ? "successful" : "failed"
    }, { new: true }).lean();
    return NextResponse.json({ payment, verified });
}
