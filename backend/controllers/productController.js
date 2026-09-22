const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");

// Pull the shared io instance set on the app in server.js
const getIO = (req) => req.app.get("io");

// @desc Get all products (with optional search, category, pagination)
// @route GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get single product by id
// @route GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("store", "name location logo");
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

// @desc Create a product (admin only) - media already uploaded via /api/products/upload
// @route POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, sizes, media, store } = req.body;

    if (!name || !description || price === undefined || !category) {
      return res.status(400).json({ message: "name, description, price and category are required" });
    }

    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock: stock || 0,
      sizes: sizes || [],
      media: media || [],
      store: store || undefined,
    });

    const io = getIO(req);
    if (io) io.emit("product:created", product);

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a product (admin only)
// @route PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const fields = ["name", "description", "price", "category", "stock", "sizes", "media", "isActive", "store"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    await product.save();

    const io = getIO(req);
    if (io) io.emit("product:updated", product);

    res.json(product);
  } catch (err) {
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

    if (stock !== undefined) product.stock = stock;
    if (sizes !== undefined) product.sizes = sizes;

    await product.save();

    const io = getIO(req);
    if (io) io.emit("product:stockUpdated", { _id: product._id, stock: product.stock, sizes: product.sizes });

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

    await Promise.all(
      product.media.map((m) =>
        cloudinary.uploader.destroy(m.publicId, { resource_type: m.type === "video" ? "video" : "image" }).catch(() => null)
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

    const media = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      type: file.mimetype.startsWith("video/") ? "video" : "image",
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
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  uploadMedia,
};
