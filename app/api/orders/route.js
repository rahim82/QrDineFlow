import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createOrderWithPayment } from "@/lib/data";
import { orderSchema } from "@/lib/validations/order";
import { Restaurant } from "@/models/Restaurant";
import { Order } from "@/models/Order";
export async function GET(request) {
    try {
        await connectToDatabase();
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get("restaurantId");
        const status = url.searchParams.get("status");
        const query = {};
        if (restaurantId)
            query.restaurantId = restaurantId;
        if (status)
            query.status = status;
        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ orders });
    }
    catch (error) {
        console.error("GET /api/orders failed", error);
        return NextResponse.json({ error: "Unable to fetch orders" }, { status: 500 });
    }
}
export async function POST(request) {
    try {
        await connectToDatabase();
        const body = await request.json();
        const parsed = orderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const restaurant = await Restaurant.findById(parsed.data.restaurantId).lean();
        if (!restaurant) {
            return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
        }
        const result = await createOrderWithPayment({
            ...parsed.data,
            gstRate: restaurant.gstRate
        });
        global.io?.to(`restaurant:${parsed.data.restaurantId}`).emit("order:new", {
            orderId: String(result.order._id),
            tableNumber: parsed.data.tableNumber,
            customerName: parsed.data.customerName,
            totalAmount: result.bill.total
        });
        global.io?.to(`table:${parsed.data.restaurantId}:${parsed.data.tableNumber}`).emit("order:status", {
            orderId: String(result.order._id),
            status: result.order.status
        });
        return NextResponse.json({
            order: result.order,
            payment: result.payment,
            bill: result.bill
        }, { status: 201 });
    }
    catch (error) {
        console.error("POST /api/orders failed", error);
        return NextResponse.json({ error: "The order could not be placed" }, { status: 500 });
    }
}
