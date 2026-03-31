import { Schema, model, models } from "mongoose";
const orderItemSchema = new Schema({
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });
const splitParticipantSchema = new Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    items: [{ type: String }]
}, { _id: false });
const orderSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    tableNumber: { type: Number, required: true },
    customerName: { type: String, required: true },
    status: {
        type: String,
        enum: ["received", "preparing", "ready", "served"],
        default: "received"
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    splitParticipants: [splitParticipantSchema],
    paymentMethod: { type: String, enum: ["cash"], required: true }
}, { timestamps: true });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
export const Order = models.Order || model("Order", orderSchema);
