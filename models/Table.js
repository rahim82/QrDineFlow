import { Schema, model, models } from "mongoose";
const tableSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableNumber: { type: Number, required: true },
    qrCodeUrl: { type: String, required: true },
    seats: { type: Number, default: 4 },
    isOccupied: { type: Boolean, default: false },
    activeOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null }
}, { timestamps: true });
tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });
export const Table = models.Table || model("Table", tableSchema);
