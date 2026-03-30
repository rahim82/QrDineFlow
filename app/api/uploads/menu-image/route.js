import { NextResponse } from "next/server";
import { hasCloudinaryConfig, uploadImageToCloudinary } from "@/lib/cloudinary";

export async function POST(request) {
    if (!hasCloudinaryConfig()) {
        return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const upload = await uploadImageToCloudinary(file);
    return NextResponse.json({ imageUrl: upload.secureUrl, publicId: upload.publicId }, { status: 201 });
}
