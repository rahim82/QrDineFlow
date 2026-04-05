import { Schema, model, models } from "mongoose";

const servedOrderItemSchema = new Schema({
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });

const servedSplitParticipantSchema = new Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    items: [{ type: String }]
}, { _id: false });

const servedOrderSchema = new Schema({
    originalOrderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    tableNumber: { type: Number, required: true },
    customerName: { type: String, required: true },
    status: { type: String, default: "served" },
    items: [servedOrderItemSchema],
    subtotal: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    splitParticipants: [servedSplitParticipantSchema],
    paymentMethod: { type: String, enum: ["cash"], required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    servedAt: { type: Date, default: Date.now }
}, { timestamps: true });

servedOrderSchema.index({ restaurantId: 1, createdAt: -1 });

export const ServedOrder = models.ServedOrder || model("ServedOrder", servedOrderSchema);
