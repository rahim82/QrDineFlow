import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createBillPdf } from "@/lib/pdf";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";
export async function GET(_, { params }) {
    await connectToDatabase();
    const { id } = await params;
    const order = await Order.findById(id).lean();
    if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const restaurant = await Restaurant.findById(order.restaurantId).lean();
    const pdf = await createBillPdf({
        orderId: String(order._id),
        restaurantName: restaurant?.name || "Restaurant",
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        createdAt: String(order.createdAt),
        lines: order.items,
        subtotal: order.subtotal,
        gstAmount: order.gstAmount,
        totalAmount: order.totalAmount
    });
    return new NextResponse(pdf, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="bill-${id}.pdf"`
        }
    });
}
