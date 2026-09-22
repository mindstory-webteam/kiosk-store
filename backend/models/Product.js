const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. S, M, L, XL or 6, 7, 8
    stock: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, default: 0, min: 0 }, // overall stock balance
    sizes: { type: [sizeSchema], default: [] }, // optional per-size stock
    media: { type: [mediaSchema], default: [] }, // images + videos
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", category: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
