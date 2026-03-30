import { Schema, model, models } from "mongoose";
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager"], required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    otpCodeHash: { type: String },
    otpExpiresAt: { type: Date },
    otpRequestedAt: { type: Date }
}, { timestamps: true });
export const User = models.User || model("User", userSchema);
