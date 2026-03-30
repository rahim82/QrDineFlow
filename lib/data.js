import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { calculateBill, splitBill } from "@/lib/billing";
import { toMenuItemView } from "@/lib/pricing";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Restaurant } from "@/models/Restaurant";
import { Table } from "@/models/Table";
import { User } from "@/models/User";
export async function getRestaurantBySlug(slug) {
    await connectToDatabase();
    return Restaurant.findOne({ slug }).lean();
}
export async function getMenuByRestaurantSlug(slug) {
    await connectToDatabase();
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant) {
        return { restaurant: null, menu: [] };
    }
    const menu = await MenuItem.find({ restaurantId: restaurant._id }).sort({ category: 1, name: 1 }).lean();
    return {
        restaurant,
        menu: menu.map(toMenuItemView)
    };
}
export async function getTableByRestaurantAndNumber(restaurantId, tableNumber) {
    await connectToDatabase();
    return Table.findOne({ restaurantId, tableNumber }).lean();
}
export async function createOrderWithPayment(input) {
    await connectToDatabase();
    const lines = input.items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: Number((item.unitPrice * item.quantity).toFixed(2))
    }));
    const bill = calculateBill(lines, input.gstRate);
    const splitParticipants = splitBill(lines, input.splitWith);
    const order = await Order.create({
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        tableNumber: input.tableNumber,
        customerName: input.customerName,
        items: lines,
        subtotal: bill.subtotal,
        gstRate: input.gstRate,
        gstAmount: bill.gstAmount,
        totalAmount: bill.total,
        splitParticipants,
        paymentMethod: input.paymentMethod
    });
    const payment = await Payment.create({
        orderId: order._id,
        restaurantId: input.restaurantId,
        method: input.paymentMethod,
        status: "pending",
        amount: bill.total
    });
    return { order, payment, bill };
}
export async function getManagerDashboardDataByRestaurantId(restaurantId) {
    await connectToDatabase();
    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant)
        return null;
    const menu = await MenuItem.find({ restaurantId }).sort({ category: 1, name: 1 }).lean();
    const [orders, tables, payments, analytics] = await Promise.all([
        Order.find({ restaurantId }).sort({ createdAt: -1 }).limit(10).lean(),
        Table.find({ restaurantId }).sort({ tableNumber: 1 }).lean(),
        Payment.find({ restaurantId }).sort({ createdAt: -1 }).limit(10).lean(),
        getAnalyticsSummary(String(restaurant._id))
    ]);
    return {
        restaurant,
        menu: menu.map(toMenuItemView),
        orders,
        tables,
        payments,
        analytics
    };
}
export async function getManagerDashboardData(slug = "sample-restaurant") {
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant)
        return null;
    return getManagerDashboardDataByRestaurantId(String(restaurant._id));
}
export async function getAdminDashboardData() {
    await connectToDatabase();
    const restaurants = await Restaurant.find({}).sort({ createdAt: -1 }).lean();
    const [managersCount, analyticsByRestaurant] = await Promise.all([
        User.countDocuments({ role: "manager" }),
        Promise.all(restaurants.map(async (restaurant) => ({
            restaurantId: String(restaurant._id),
            analytics: await getAnalyticsSummary(String(restaurant._id))
        })))
    ]);
    const analyticsMap = new Map(analyticsByRestaurant.map((entry) => [entry.restaurantId, entry.analytics]));
    const restaurantSummaries = restaurants.map((restaurant) => {
        const analytics = analyticsMap.get(String(restaurant._id));
        return {
            _id: String(restaurant._id),
            name: restaurant.name,
            slug: restaurant.slug,
            tagline: restaurant.tagline,
            gstRate: restaurant.gstRate,
            createdAt: restaurant.createdAt,
            monthlySales: analytics?.sales.monthly || 0
        };
    });
    const combinedMostOrdered = new Map();
    let totalMonthlySales = 0;
    for (const summary of restaurantSummaries) {
        totalMonthlySales += summary.monthlySales;
        const analytics = analyticsMap.get(summary._id);
        for (const item of analytics?.mostOrderedItems || []) {
            combinedMostOrdered.set(item.name, (combinedMostOrdered.get(item.name) || 0) + item.quantity);
        }
    }
    return {
        restaurants: restaurantSummaries,
        totals: {
            restaurants: restaurantSummaries.length,
            managers: managersCount,
            monthlySales: totalMonthlySales
        },
        mostOrderedItems: [...combinedMostOrdered.entries()]
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
    };
}
export async function getAnalyticsSummary(restaurantId) {
    await connectToDatabase();
    const now = new Date();
    const objectId = new mongoose.Types.ObjectId(restaurantId);
    const [daily, weekly, monthly, orders] = await Promise.all([
        Order.aggregate([
            { $match: { restaurantId: objectId, createdAt: { $gte: startOfDay(now) } } },
            { $group: { _id: null, revenue: { $sum: "$totalAmount" } } }
        ]),
        Order.aggregate([
            { $match: { restaurantId: objectId, createdAt: { $gte: startOfWeek(now) } } },
            { $group: { _id: null, revenue: { $sum: "$totalAmount" } } }
        ]),
        Order.aggregate([
            { $match: { restaurantId: objectId, createdAt: { $gte: startOfMonth(now) } } },
            { $group: { _id: null, revenue: { $sum: "$totalAmount" } } }
        ]),
        Order.find({ restaurantId: objectId }).lean()
    ]);
    const itemMap = new Map();
    const hourMap = new Map();
    const tableMap = new Map();
    for (const order of orders) {
        for (const item of order.items) {
            itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
        }
        const hour = new Date(order.createdAt).getHours().toString().padStart(2, "0") + ":00";
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        const current = tableMap.get(order.tableNumber) || { revenue: 0, orders: 0 };
        tableMap.set(order.tableNumber, {
            revenue: current.revenue + order.totalAmount,
            orders: current.orders + 1
        });
    }
    return {
        sales: {
            daily: daily[0]?.revenue || 0,
            weekly: weekly[0]?.revenue || 0,
            monthly: monthly[0]?.revenue || 0
        },
        mostOrderedItems: [...itemMap.entries()]
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5),
        peakOrderTime: [...hourMap.entries()]
            .map(([hour, orders]) => ({ hour, orders }))
            .sort((a, b) => a.hour.localeCompare(b.hour)),
        tablePerformance: [...tableMap.entries()]
            .map(([tableNumber, stats]) => ({ tableNumber, revenue: stats.revenue, orders: stats.orders }))
            .sort((a, b) => a.tableNumber - b.tableNumber)
    };
}
