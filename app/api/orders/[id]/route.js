import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
export async function PATCH(request, { params }) {
    await connectToDatabase();
    const { id } = await params;
    const body = (await request.json());
    const order = await Order.findByIdAndUpdate(id, { status: body.status }, { new: true }).lean();
    if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    global.io?.to(`restaurant:${String(order.restaurantId)}`).emit("order:updated", {
        orderId: String(order._id),
        status: order.status,
        tableNumber: order.tableNumber
    });
    global.io?.to(`table:${String(order.restaurantId)}:${order.tableNumber}`).emit("order:status", {
        orderId: String(order._id),
        status: order.status
    });
    return NextResponse.json({ order });
}
