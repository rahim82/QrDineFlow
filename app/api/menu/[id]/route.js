import { NextResponse } from "next/server";
import { deleteImageFromCloudinary } from "@/lib/cloudinary";
import { connectToDatabase } from "@/lib/db";
import { toMenuItemView } from "@/lib/pricing";
import { menuItemSchema } from "@/lib/validations/menu";
import { MenuItem } from "@/models/MenuItem";

export async function PATCH(request, { params }) {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const parsed = menuItemSchema.partial().safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const existing = await MenuItem.findById(id);
    if (!existing) {
        return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const previousImagePublicId = existing.imagePublicId;
    const nextImagePublicId = Object.prototype.hasOwnProperty.call(parsed.data, "imagePublicId")
        ? parsed.data.imagePublicId
        : existing.imagePublicId;
    const shouldDeleteExistingImage = Boolean(
        previousImagePublicId &&
        (nextImagePublicId !== previousImagePublicId || (parsed.data.image && parsed.data.image !== existing.image))
    );

    Object.assign(existing, parsed.data);
    await existing.save();

    if (shouldDeleteExistingImage) {
        await deleteImageFromCloudinary(previousImagePublicId);
    }

    const item = existing.toObject();
    return NextResponse.json({ item: toMenuItemView(item) });
}

export async function DELETE(_, { params }) {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await MenuItem.findByIdAndDelete(id).lean();
    if (!deleted) {
        return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }
    if (deleted.imagePublicId) {
        await deleteImageFromCloudinary(deleted.imagePublicId);
    }
    return NextResponse.json({ ok: true });
}
