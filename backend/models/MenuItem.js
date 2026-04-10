import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const pricingRuleSchema = new Schema({
    label: { type: String, required: true },
    percentageOff: { type: Number, required: true },
    activeFromHour: { type: Number, required: true },
    activeToHour: { type: Number, required: true }
}, { _id: false });
const menuItemSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    status: { type: String, enum: ["in_stock", "out_of_stock"], default: "in_stock" },
    tags: [{ type: String }],
    pricingRules: [pricingRuleSchema]
}, { timestamps: true });
menuItemSchema.index({ restaurantId: 1, category: 1 });
export const MenuItem = models.MenuItem || model("MenuItem", menuItemSchema);
