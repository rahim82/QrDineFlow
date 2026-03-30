import { Schema, model, models } from "mongoose";
const paymentSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    method: { type: String, enum: ["card", "cash"], required: true },
    status: { type: String, enum: ["pending", "successful", "failed"], default: "pending" },
    amount: { type: Number, required: true }
}, { timestamps: true });
paymentSchema.index({ orderId: 1 });
export const Payment = models.Payment || model("Payment", paymentSchema);
