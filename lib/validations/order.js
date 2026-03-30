import { z } from "zod";
export const orderSchema = z.object({
    restaurantId: z.string().min(1),
    tableId: z.string().min(1),
    tableNumber: z.number().int().positive(),
    customerName: z.string().min(2),
    items: z.array(z.object({
        menuItemId: z.string().min(1),
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive()
    })),
    paymentMethod: z.enum(["card", "cash"]),
    splitWith: z.array(z.string()).default([])
});
