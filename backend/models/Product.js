const mongoose = require("mongoose");

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const slugify = (str = "") =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/* ------------------------------------------------------------------ */
/* sub-schemas                                                         */
/* ------------------------------------------------------------------ */

// One selectable variant. Kept named "size" for backward compatibility with
// the existing admin UI, but it now also carries per-variant SKU / price so a
// Shopify-style multi-option export round-trips without losing data.
const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true }, // S, M, L, 42, "500 g"...
    stock: { type: Number, required: true, default: 0, min: 0 },
    sku: { type: String, trim: true, default: "" },
    barcode: { type: String, trim: true, default: "" },
    price: { type: Number, min: 0 }, // falls back to product.price when unset
    compareAtPrice: { type: Number, min: 0 },
    grams: { type: Number, min: 0 },
    imageUrl: { type: String, trim: true, default: "" }, // Shopify "Variant Image"
  },
  { _id: false }
);

// publicId is now OPTIONAL: images imported from a spreadsheet live on someone
// else's CDN (Shopify, S3, ...) and have no Cloudinary public id. `source`
// tells deleteProduct whether it owns the asset.
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["image", "video"], required: true, default: "image" },
    position: { type: Number, default: 1, min: 1 },
    alt: { type: String, trim: true, default: "" },
    source: { type: String, enum: ["cloudinary", "external"], default: "cloudinary" },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const weightSchema = new mongoose.Schema(
  {
    value: { type: Number, default: 0, min: 0 },
    unit: { type: String, enum: ["g", "kg", "lb", "oz"], default: "g" },
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
/* product                                                             */
/* ------------------------------------------------------------------ */

const productSchema = new mongoose.Schema(
  {
    /* --- identity ------------------------------------------------- */
    // Stable external key. This is what import upserts on, so re-uploading an
    // edited export updates rows instead of duplicating them.
    handle: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    name: { type: String, required: true, trim: true }, // Title
    subName: { type: String, trim: true, default: "" }, // metafield "Sub name"
    description: { type: String, required: true }, // Body (HTML)

    /* --- pricing -------------------------------------------------- */
    price: { type: Number, required: true, min: 0 }, // Variant Price
    compareAtPrice: { type: Number, min: 0 }, // Variant Compare At Price
    costPerItem: { type: Number, min: 0 }, // Cost per item

    /* --- classification ------------------------------------------- */
    category: { type: String, required: true, trim: true }, // Product Category
    productType: { type: String, trim: true, default: "" }, // Type
    vendor: { type: String, trim: true, default: "" }, // Vendor
    tags: { type: [String], default: [] }, // Tags (comma separated)

    /* --- inventory ------------------------------------------------ */
    sku: { type: String, trim: true, default: "", index: true }, // Variant SKU
    barcode: { type: String, trim: true, default: "" }, // Variant Barcodes
    stock: { type: Number, required: true, default: 0, min: 0 }, // Variant Inventory Qty
    inventoryTracker: { type: String, trim: true, default: "shopify" },
    inventoryPolicy: { type: String, enum: ["deny", "continue"], default: "deny" },
    fulfillmentService: { type: String, trim: true, default: "manual" },
    weight: { type: weightSchema, default: () => ({}) }, // Variant Grams + Weight Unit
    requiresShipping: { type: Boolean, default: true },
    taxable: { type: Boolean, default: true },
    taxCode: { type: String, trim: true, default: "" },
    giftCard: { type: Boolean, default: false },

    /* --- options / variants --------------------------------------- */
    optionName: { type: String, trim: true, default: "Title" }, // Option1 Name
    sizes: { type: [sizeSchema], default: [] }, // one entry per variant

    /* --- media ---------------------------------------------------- */
    media: { type: [mediaSchema], default: [] },

    /* --- storefront ----------------------------------------------- */
    seo: { type: seoSchema, default: () => ({}) },
    faqs: { type: [String], default: [] }, // koffynex.p_faqs metafield
    // Anything in the sheet we don't map explicitly is preserved here so an
    // export → edit → import cycle is lossless.
    metafields: { type: Map, of: String, default: () => new Map() },

    /* --- state ---------------------------------------------------- */
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      index: true,
    },
    published: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },

    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", category: "text", description: "text", tags: "text" });

/* ------------------------------------------------------------------ */
/* hooks                                                               */
/* ------------------------------------------------------------------ */

productSchema.pre("validate", function (next) {
  if (!this.handle && this.name) this.handle = slugify(this.name);

  // status is the source of truth; isActive stays derived so every existing
  // `{ isActive: true }` query in the app keeps working unchanged.
  if (this.isModified("status")) this.isActive = this.status === "active";
  if (this.isModified("isActive") && !this.isModified("status")) {
    this.status = this.isActive ? "active" : "draft";
  }

  // Overall stock always mirrors the sum of the variants when variants exist.
  if (Array.isArray(this.sizes) && this.sizes.length) {
    this.stock = this.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
  }

  // Keep media positions contiguous and 1-based.
  if (Array.isArray(this.media)) {
    this.media.forEach((m, i) => {
      if (!m.position) m.position = i + 1;
      if (!m.type) m.type = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(m.url) ? "video" : "image";
      if (!m.source) m.source = m.publicId ? "cloudinary" : "external";
    });
  }

  next();
});

productSchema.statics.slugify = slugify;

module.exports = mongoose.model("Product", productSchema);