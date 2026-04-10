import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import mongoose from "mongoose";
import { connectToDatabase } from "./db.js";
import { calculateBill, splitBill } from "./billing.js";
import { toMenuItemView } from "./pricing.js";
import { MenuItem } from "./models/MenuItem.js";
import { Order } from "./models/Order.js";
import { Payment } from "./models/Payment.js";
import { Restaurant } from "./models/Restaurant.js";
import { ServedOrder } from "./models/ServedOrder.js";
import { Table } from "./models/Table.js";
import { User } from "./models/User.js";

function serializeOrderForClient(order) {
    const effectiveSubtotal = typeof order.subtotal === "number"
        ? order.subtotal
        : (order.items || []).reduce((sum, item) => sum + item.totalPrice, 0);

    return {
        _id: String(order._id),
        restaurantId: String(order.restaurantId),
        tableId: String(order.tableId),
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        status: order.status,
        subtotal: effectiveSubtotal,
        gstRate: order.gstRate,
        gstAmount: order.gstAmount,
        totalAmount: effectiveSubtotal,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
        updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : null,
        items: (order.items || []).map((item) => ({
            menuItemId: String(item.menuItemId),
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
        })),
        splitParticipants: (order.splitParticipants || []).map((participant) => ({
            name: participant.name,
            amount: participant.amount,
            items: participant.items || []
        }))
    };
}

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
    await Table.findByIdAndUpdate(input.tableId, {
        isOccupied: true,
        activeOrderId: order._id
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
        orders: orders.map(serializeOrderForClient),
        tables: tables.map((table) => ({
            ...table,
            _id: String(table._id),
            restaurantId: String(table.restaurantId),
            activeOrderId: table.activeOrderId ? String(table.activeOrderId) : null
        })),
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
    const managers = await User.find({ role: "manager" }).sort({ createdAt: -1 }).lean();
    const [managersCount, analyticsByRestaurant] = await Promise.all([
        Promise.resolve(managers.length),
        Promise.all(restaurants.map(async (restaurant) => ({
            restaurantId: String(restaurant._id),
            analytics: await getAnalyticsSummary(String(restaurant._id))
        })))
    ]);
    const analyticsMap = new Map(analyticsByRestaurant.map((entry) => [entry.restaurantId, entry.analytics]));
    const managersByRestaurant = new Map();
    for (const manager of managers) {
        const key = manager.restaurantId ? String(manager.restaurantId) : "";
        if (!key)
            continue;
        managersByRestaurant.set(key, [...(managersByRestaurant.get(key) || []), {
                _id: String(manager._id),
                name: manager.name,
                email: manager.email
            }]);
    }
    const restaurantSummaries = restaurants.map((restaurant) => {
        const analytics = analyticsMap.get(String(restaurant._id));
        return {
            _id: String(restaurant._id),
            name: restaurant.name,
            slug: restaurant.slug,
            tagline: restaurant.tagline,
            gstRate: restaurant.gstRate,
            createdAt: restaurant.createdAt,
            monthlySales: analytics?.sales.monthly || 0,
            managers: managersByRestaurant.get(String(restaurant._id)) || []
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
    const [activeOrders, servedOrders] = await Promise.all([
        Order.find({ restaurantId: objectId }).lean(),
        ServedOrder.find({ restaurantId: objectId }).lean()
    ]);
    const analyticsOrders = [...activeOrders, ...servedOrders];
    const itemMap = new Map();
    const hourMap = new Map();
    const tableMap = new Map();
    const todayOrders = analyticsOrders.filter((order) => new Date(order.createdAt) >= startOfDay(now));
    const weeklyOrders = analyticsOrders.filter((order) => new Date(order.createdAt) >= startOfWeek(now));
    const monthlyOrders = analyticsOrders.filter((order) => new Date(order.createdAt) >= startOfMonth(now));

    const getOrderRevenue = (order) => typeof order.subtotal === "number" ? order.subtotal : order.totalAmount;

    for (const order of analyticsOrders) {
        for (const item of order.items) {
            itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
        }
        const hour = new Date(order.createdAt).getHours().toString().padStart(2, "0") + ":00";
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        const current = tableMap.get(order.tableNumber) || { revenue: 0, orders: 0 };
        const orderRevenue = getOrderRevenue(order);
        tableMap.set(order.tableNumber, {
            revenue: current.revenue + orderRevenue,
            orders: current.orders + 1
        });
    }

    const dailySales = todayOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const weeklySales = weeklyOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const monthlySales = monthlyOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const totalOrders = analyticsOrders.length;
    const averageOrderValue = totalOrders ? analyticsOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0) / totalOrders : 0;

    return {
        sales: {
            daily: dailySales,
            weekly: weeklySales,
            monthly: monthlySales
        },
        totals: {
            orders: totalOrders,
            averageOrderValue
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
