/**
 * One-off backfill for products created before the schema change.
 *
 *   node scripts/migrateProducts.js
 *
 * Safe to run more than once — it only fills in fields that are missing.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("connected");

  const products = await Product.find({});
  const taken = new Set(products.map((p) => p.handle).filter(Boolean));

  let changed = 0;

  for (const p of products) {
    let dirty = false;

    if (!p.handle) {
      let base = slugify(p.name) || `product-${p._id.toString().slice(-6)}`;
      let handle = base;
      let n = 2;
      while (taken.has(handle)) handle = `${base}-${n++}`; // keep the unique index happy
      taken.add(handle);
      p.handle = handle;
      dirty = true;
    }

    if (!p.status) {
      p.status = p.isActive === false ? "draft" : "active";
      dirty = true;
    }

    if (p.published === undefined) {
      p.published = p.status === "active";
      dirty = true;
    }

    if (!p.optionName) {
      p.optionName = p.sizes?.length ? "Size" : "Title";
      dirty = true;
    }

    if (!p.weight || p.weight.value === undefined) {
      p.weight = { value: 0, unit: "g" };
      dirty = true;
    }

    // Existing media was all uploaded by this app, so it is Cloudinary-owned.
    (p.media || []).forEach((m, i) => {
      if (!m.source) {
        m.source = m.publicId ? "cloudinary" : "external";
        dirty = true;
      }
      if (!m.position) {
        m.position = i + 1;
        dirty = true;
      }
    });

    if (dirty) {
      await p.save();
      changed++;
    }
  }

  console.log(`updated ${changed} of ${products.length} products`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});