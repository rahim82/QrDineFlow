import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
export async function POST(request) {
    const body = (await request.json());
    if (!env.razorpayKeyId || !env.razorpayKeySecret) {
        return NextResponse.json({
            provider: "mock",
            order: {
                id: `mock_${Date.now()}`,
                amount: body.amount * 100,
                currency: "INR",
                receipt: body.receipt
            }
        });
    }
    const razorpay = new Razorpay({
        key_id: env.razorpayKeyId,
        key_secret: env.razorpayKeySecret
    });
    const order = await razorpay.orders.create({
        amount: Math.round(body.amount * 100),
        currency: "INR",
        receipt: body.receipt
    });
    return NextResponse.json({ provider: "razorpay", order });
}
