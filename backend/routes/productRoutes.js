const express = require("express");
const {
  getProducts,
  getProductById,
  getCategories,
  getVendors,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  uploadMedia,
} = require("../controllers/productController");
const {
  exportProducts,
  downloadTemplate,
  importProducts,
} = require("../controllers/productIOController");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");
const uploadSheet = require("../middleware/uploadSheet");

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */
router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/vendors", getVendors);

/* ------------------------------------------------------------------ */
/* Admin — spreadsheet import / export                                 */
/* IMPORTANT: these literal paths must be registered BEFORE "/:id",     */
/* otherwise Express matches "export" as an :id.                        */
/* ------------------------------------------------------------------ */
router.get("/export", protect, adminOnly, exportProducts);
router.get("/template", protect, adminOnly, downloadTemplate);
router.post("/import", protect, adminOnly, uploadSheet.single("file"), importProducts);

/* ------------------------------------------------------------------ */
/* Admin — media + CRUD                                                */
/* ------------------------------------------------------------------ */
router.post("/upload", protect, adminOnly, upload.array("files", 10), uploadMedia);
router.post("/", protect, adminOnly, createProduct);

/* Public single product (also accepts a handle) — keep last */
router.get("/:id", getProductById);

router.put("/:id", protect, adminOnly, updateProduct);
router.patch("/:id/stock", protect, adminOnly, updateStock);
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;