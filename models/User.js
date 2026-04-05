import { Schema, model, models } from "mongoose";
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    role: { type: String, enum: ["admin", "manager"], required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" }
}, { timestamps: true });
export const User = models.User || model("User", userSchema);
