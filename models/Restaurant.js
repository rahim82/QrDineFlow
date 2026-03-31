import { Schema, model, models } from "mongoose";
const restaurantSchema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tagline: { type: String, required: true },
    logo: { type: String },
    managerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    gstRate: { type: Number, default: 0 }
}, { timestamps: true });
export const Restaurant = models.Restaurant || model("Restaurant", restaurantSchema);
