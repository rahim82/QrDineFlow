import bcrypt from "bcryptjs";
import { env } from "../lib/env.js";
import { connectToDatabase } from "../lib/db.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Restaurant } from "../models/Restaurant.js";
import { Table } from "../models/Table.js";
import { User } from "../models/User.js";
const menuSeed = [
    {
        category: "Veg",
        name: "Truffle Paneer Tikka",
        description: "Charred cottage cheese, smoked yogurt glaze, and pickled onions.",
        price: 349,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
        status: "in_stock",
        tags: ["Veg", "Popular"],
        pricingRules: [{ label: "Happy Hour", percentageOff: 15, activeFromHour: 16, activeToHour: 18 }]
    },
    {
        category: "Non-Veg",
        name: "Fire Roast Chicken Bowl",
        description: "Charcoal chicken, garlic rice, greens, and citrus dressing.",
        price: 429,
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80",
        status: "in_stock",
        tags: ["High Protein"],
        pricingRules: []
    },
    {
        category: "Drinks",
        name: "Mango Basil Cooler",
        description: "Fresh mango, basil leaves, soda sparkle, and lime.",
        price: 179,
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
        status: "in_stock",
        tags: ["Summer"],
        pricingRules: []
    },
    {
        category: "Desserts",
        name: "Saffron Tres Leches",
        description: "Soft milk cake finished with saffron cream and pistachio.",
        price: 219,
        image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1200&q=80",
        status: "out_of_stock",
        tags: ["Dessert"],
        pricingRules: []
    }
];
export async function seedDatabase() {
    await connectToDatabase();
    await Promise.all([
        Payment.deleteMany({}),
        Order.deleteMany({}),
        Table.deleteMany({}),
        MenuItem.deleteMany({}),
        User.deleteMany({}),
        Restaurant.deleteMany({})
    ]);
    const restaurant = await Restaurant.create({
        name: "Amber Courtyard",
        slug: "sample-restaurant",
        tagline: "Modern Indian plates, fast table ordering, and beautiful service flow.",
        gstRate: 0.05
    });
    const baseUrl = env.appUrl;
    const tables = await Table.insertMany(Array.from({ length: 8 }, (_, index) => ({
        restaurantId: restaurant._id,
        tableNumber: index + 1,
        qrCodeUrl: `${baseUrl}/menu/${restaurant.slug}/${index + 1}`,
        seats: index < 2 ? 2 : 4
    })));
    const items = await MenuItem.insertMany(menuSeed.map((item) => ({
        ...item,
        restaurantId: restaurant._id
    })));
    const adminPassword = await bcrypt.hash("password123", 10);
    const managerPassword = await bcrypt.hash("password123", 10);
    const [admin, manager] = await Promise.all([
        User.create({
            name: "Platform Admin",
            email: "admin@demo.com",
            passwordHash: adminPassword,
            role: "admin"
        }),
        User.create({
            name: "Floor Manager",
            email: "manager@demo.com",
            passwordHash: managerPassword,
            role: "manager",
            restaurantId: restaurant._id
        })
    ]);
    restaurant.managerIds = [manager._id];
    await restaurant.save();
    const order = await Order.create({
        restaurantId: restaurant._id,
        tableId: tables[0]._id,
        tableNumber: 1,
        customerName: "Aarav",
        status: "preparing",
        items: [
            {
                menuItemId: items[0]._id,
                name: items[0].name,
                quantity: 2,
                unitPrice: items[0].price,
                totalPrice: items[0].price * 2
            },
            {
                menuItemId: items[2]._id,
                name: items[2].name,
                quantity: 1,
                unitPrice: items[2].price,
                totalPrice: items[2].price
            }
        ],
        subtotal: items[0].price * 2 + items[2].price,
        gstRate: 0.05,
        gstAmount: Number(((items[0].price * 2 + items[2].price) * 0.05).toFixed(2)),
        totalAmount: Number(((items[0].price * 2 + items[2].price) * 1.05).toFixed(2)),
        splitParticipants: [
            { name: "Aarav", amount: 438.5, items: [items[0].name] },
            { name: "Mira", amount: 438.5, items: [items[2].name] }
        ],
        paymentMethod: "card"
    });
    await Payment.create({
        orderId: order._id,
        restaurantId: restaurant._id,
        method: "card",
        status: "successful",
        amount: order.totalAmount,
        razorpayOrderId: `seed_order_${Date.now()}`,
        razorpayPaymentId: `seed_payment_${Date.now()}`
    });
    return {
        ok: true,
        restaurantId: String(restaurant._id),
        users: [
            { email: admin.email, password: "password123", role: admin.role },
            { email: manager.email, password: "password123", role: manager.role }
        ]
    };
}
const isDirectRun = process.argv[1]?.includes("seed.js");
if (isDirectRun) {
    seedDatabase()
        .then((result) => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    })
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
