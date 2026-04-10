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
    "JWT_SECRET",
    "API_BASE_URL",
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
    jwtSecret: clean(process.env.JWT_SECRET) || "change-me-in-production",
    appUrl: clean(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000",
    apiBaseUrl: clean(process.env.API_BASE_URL) || clean(process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:4000",
    socketUrl: clean(process.env.NEXT_PUBLIC_SOCKET_URL) || clean(process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:4000",
    googleClientId: clean(process.env.GOOGLE_CLIENT_ID) || "",
    googleClientSecret: clean(process.env.GOOGLE_CLIENT_SECRET) || "",
};
