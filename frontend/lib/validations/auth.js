import { z } from "zod";
export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6)
});

export const managerRegisterSchema = z.object({
    managerName: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    restaurantName: z.string().min(2),
    tagline: z.string().min(8)
});

export const adminCreateManagerSchema = z.object({
    restaurantId: z.string().min(1),
    managerName: z.string().min(2),
    email: z.email(),
    password: z.string().min(6)
});
