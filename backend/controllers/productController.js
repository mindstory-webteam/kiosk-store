const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");

// Pull the shared io instance set on the app in server.js
const getIO = (req) => req.app.get("io");

// Every field an admin is allowed to set through the API.
const WRITABLE_FIELDS = [
  "handle",
  "name",
  "subName",
  "description",
  "price",
  "compareAtPrice",
  "costPerItem",
  "category",
  "productType",
  "vendor",
  "tags",
  "sku",
  "barcode",
  "stock",
  "inventoryTracker",
  "inventoryPolicy",
  "fulfillmentService",
  "weight",
  "requiresShipping",
  "taxable",
  "taxCode",
  "giftCard",
  "optionName",
  "sizes",
  "media",
  "seo",
  "faqs",
  "metafields",
  "status",
  "published",
  "isActive",
  "store",
];

// @desc Get all products (with optional search, category, pagination)
// @route GET /api/products
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      vendor,
      tag,
      status,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    // Admin callers can ask for drafts/archived; the storefront still gets
    // only active products by default.
    const query = status ? { status } : { isActive: true };

    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (vendor) query.vendor = vendor;
    if (tag) query.tags = tag;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get single product by id or handle
// @route GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const byId = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : null;
    const product = await Product.findOne(byId || { handle: id.toLowerCase() }).populate(
      "store",
      "name location logo"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get distinct categories
// @route GET /api/products/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category", { isActive: true });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get distinct vendors
// @route GET /api/products/vendors
const getVendors = async (req, res) => {
  try {
    const vendors = await Product.distinct("vendor", { isActive: true });
    res.json(vendors.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a product (admin only) - media already uploaded via /api/products/upload
// @route POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    if (!name || !description || price === undefined || !category) {
      return res
        .status(400)
        .json({ message: "name, description, price and category are required" });
    }

    const data = {};
    WRITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    });

    const product = await Product.create(data);

    const io = getIO(req);
    if (io) io.emit("product:created", product);

    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "A product with that handle or SKU already exists." });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a product (admin only)
// @route PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    WRITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) product.set(field, req.body[field]);
    });

    await product.save();

    const io = getIO(req);
    if (io) io.emit("product:updated", product);

    res.json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "A product with that handle or SKU already exists." });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc Update stock only (admin only) - quick live stock adjustment
// @route PATCH /api/products/:id/stock
const updateStock = async (req, res) => {
  try {
    const { stock, sizes } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (sizes !== undefined) product.sizes = sizes;
    // When variants exist the pre-validate hook recomputes `stock` from them,
    // so a bare stock write is only honoured for variant-less products.
    if (stock !== undefined) product.stock = stock;

    await product.save();

    const io = getIO(req);
    if (io)
      io.emit("product:stockUpdated", {
        _id: product._id,
        stock: product.stock,
        sizes: product.sizes,
      });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a product (admin only) - also removes Cloudinary media
// @route DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Imported media lives on someone else's CDN and has no publicId — only
    // destroy assets this app actually uploaded.
    await Promise.all(
      (product.media || [])
        .filter((m) => m.publicId && m.source !== "external")
        .map((m) =>
          cloudinary.uploader
            .destroy(m.publicId, { resource_type: m.type === "video" ? "video" : "image" })
            .catch(() => null)
        )
    );

    await product.deleteOne();

    const io = getIO(req);
    if (io) io.emit("product:deleted", { _id: product._id });

    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Upload product media (images/videos) to Cloudinary
// @route POST /api/products/upload
const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const media = req.files.map((file, i) => ({
      url: file.path,
      publicId: file.filename,
      type: file.mimetype.startsWith("video/") ? "video" : "image",
      position: i + 1,
      alt: "",
      source: "cloudinary",
    }));

    res.status(201).json({ media });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  getVendors,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  uploadMedia,
};