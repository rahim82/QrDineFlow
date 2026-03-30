import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
export async function GET(request) {
    const url = new URL(request.url);
    const restaurantSlug = url.searchParams.get("restaurantSlug");
    const tableNumber = url.searchParams.get("tableNumber");
    if (!restaurantSlug || !tableNumber) {
        return NextResponse.json({ error: "restaurantSlug and tableNumber are required" }, { status: 400 });
    }
    const qrUrl = `${env.appUrl}/menu/${restaurantSlug}/${tableNumber}`;
    const dataUrl = await QRCode.toDataURL(qrUrl, {
        margin: 1,
        width: 300
    });
    return NextResponse.json({ qrUrl, dataUrl });
}
