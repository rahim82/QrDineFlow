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

function clean(value) {
    return typeof value === "string" ? value.trim() : value;
}

export const env = {
    mongodbUri: clean(process.env.MONGODB_URI) || "mongodb://127.0.0.1:27017/qr-ordering",
    jwtSecret: clean(process.env.JWT_SECRET) || "change-me-in-production",
    appUrl: clean(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000",
    googleClientId: clean(process.env.GOOGLE_CLIENT_ID) || "",
    googleClientSecret: clean(process.env.GOOGLE_CLIENT_SECRET) || "",
    razorpayKeyId: clean(process.env.RAZORPAY_KEY_ID) || "",
    razorpayKeySecret: clean(process.env.RAZORPAY_KEY_SECRET) || "",
    cloudinaryCloudName: clean(process.env.CLOUDINARY_CLOUD_NAME) || "",
    cloudinaryApiKey: clean(process.env.CLOUDINARY_API_KEY) || "",
    cloudinaryApiSecret: clean(process.env.CLOUDINARY_API_SECRET) || ""
};
