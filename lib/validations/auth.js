import { z } from "zod";
export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6)
});

export const requestOtpSchema = z.object({
    email: z.email()
});

export const verifyOtpSchema = z.object({
    email: z.email(),
    otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits")
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
