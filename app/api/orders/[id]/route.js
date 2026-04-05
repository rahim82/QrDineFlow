import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { ServedOrder } from "@/models/ServedOrder";
import { Table } from "@/models/Table";
export async function PATCH(request, { params }) {
    await connectToDatabase();
    const { id } = await params;
    const body = (await request.json());
    const existingOrder = await Order.findById(id).lean();
    if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (body.status === "served") {
        await ServedOrder.create({
            originalOrderId: existingOrder._id,
            restaurantId: existingOrder.restaurantId,
            tableId: existingOrder.tableId,
            tableNumber: existingOrder.tableNumber,
            customerName: existingOrder.customerName,
            status: "served",
            items: existingOrder.items,
            subtotal: existingOrder.subtotal,
            gstRate: existingOrder.gstRate,
            gstAmount: existingOrder.gstAmount,
            totalAmount: existingOrder.totalAmount,
            splitParticipants: existingOrder.splitParticipants,
            paymentMethod: existingOrder.paymentMethod,
            createdAt: existingOrder.createdAt,
            updatedAt: existingOrder.updatedAt,
            servedAt: new Date()
        });
        await Table.findByIdAndUpdate(existingOrder.tableId, {
            isOccupied: false,
            activeOrderId: null
        });
        await Order.findByIdAndDelete(id);
        global.io?.to(`restaurant:${String(existingOrder.restaurantId)}`).emit("order:updated", {
            orderId: String(existingOrder._id),
            status: "served",
            tableNumber: existingOrder.tableNumber,
            removed: true
        });
        global.io?.to(`table:${String(existingOrder.restaurantId)}:${existingOrder.tableNumber}`).emit("order:status", {
            orderId: String(existingOrder._id),
            status: "served"
        });
        return NextResponse.json({
            removed: true,
            freedTableId: String(existingOrder.tableId)
        });
    }
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
