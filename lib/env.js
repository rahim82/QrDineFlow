import { existsSync } from "node:fs";
import path from "node:path";

const envFiles = [".env.local", ".ENV.LOCAL", ".env"];

for (const file of envFiles) {
    const envPath = path.resolve(process.cwd(), file);
    if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
        process.loadEnvFile(envPath);
    }
}

const requiredEnv = [
    "MONGODB_URI",
    "JWT_SECRET",
    "NEXT_PUBLIC_APP_URL"
];
export function validateEnv() {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
        console.warn(`Missing env variables: ${missing.join(", ")}`);
    }
}
export const env = {
    mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/qr-ordering",
    jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpFrom: process.env.SMTP_FROM || "",
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || ""
};
