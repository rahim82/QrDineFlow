import { z } from "zod";
export const menuItemSchema = z.object({
    restaurantId: z.string().min(1),
    category: z.string().min(1),
    name: z.string().min(2),
    description: z.string().min(3),
    price: z.number().positive(),
    image: z.string().url(),
    imagePublicId: z.string().min(1).optional(),
    status: z.enum(["in_stock", "out_of_stock"]),
    tags: z.array(z.string()).default([]),
    pricingRules: z
        .array(z.object({
        label: z.string(),
        percentageOff: z.number().min(0).max(100),
        activeFromHour: z.number().min(0).max(23),
        activeToHour: z.number().min(1).max(24)
    }))
        .default([])
});
