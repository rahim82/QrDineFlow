import { createHash } from "node:crypto";
import { env } from "./env.js";

export function hasCloudinaryConfig() {
    return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

function createCloudinarySignature(params) {
    const sorted = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
    return createHash("sha1")
        .update(`${sorted}${env.cloudinaryApiSecret}`)
        .digest("hex");
}

export async function uploadImageToCloudinary(file, options = {}) {
    if (!hasCloudinaryConfig()) {
        throw new Error("Cloudinary is not configured");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = options.folder || "qr-dineflow/menu-items";
    const signature = createCloudinarySignature({ folder, timestamp });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", env.cloudinaryApiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", folder);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return {
        publicId: data.public_id,
        secureUrl: data.secure_url
    };
}

export async function deleteImageFromCloudinary(publicId) {
    if (!publicId || !hasCloudinaryConfig()) {
        return { deleted: false };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createCloudinarySignature({ public_id: publicId, timestamp });
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("api_key", env.cloudinaryApiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/destroy`, {
        method: "POST",
        body: formData
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary delete failed");
    }
    return { deleted: data.result === "ok" || data.result === "not found" };
}
