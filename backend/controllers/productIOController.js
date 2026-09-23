const Product = require("../models/Product");
const {
  HEADERS,
  TEMPLATE_HEADERS,
  parseSheet,
  rowsToProducts,
  buildWorkbook,
  buildCsv,
} = require("../utils/productSheet");

const getIO = (req) => req.app.get("io");

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const stamp = () => new Date().toISOString().slice(0, 10);

const sendFile = (res, { buffer, filename, mime }) => {
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  // So the browser can read the filename back off the response.
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Content-Length", Buffer.byteLength(buffer));
  return res.send(buffer);
};

/* ================================================================== */
/* EXPORT                                                             */
/* ================================================================== */

// @desc   Download every product as .xlsx or .csv
// @route  GET /api/products/export?format=xlsx&category=Mugs&status=active&search=mug
// @access Admin
const exportProducts = async (req, res) => {
  try {
    const { format = "xlsx", category, status, search, ids } = req.query;

    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.$text = { $search: search };
    if (ids) query._id = { $in: String(ids).split(",").filter(Boolean) };

    const products = await Product.find(query).sort({ createdAt: -1 }).lean();

    if (format === "csv") {
      return sendFile(res, {
        buffer: Buffer.from(buildCsv(products), "utf8"),
        filename: `products_export_${stamp()}.csv`,
        mime: "text/csv; charset=utf-8",
      });
    }

    const buffer = await buildWorkbook(products);
    return sendFile(res, {
      buffer: Buffer.from(buffer),
      filename: `products_export_${stamp()}.xlsx`,
      mime: XLSX_MIME,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Download an empty sheet with the expected columns + one example row
// @route  GET /api/products/template?format=xlsx
// @access Admin
const downloadTemplate = async (req, res) => {
  try {
    const { format = "xlsx", full } = req.query;
    const headers = full === "true" ? HEADERS : TEMPLATE_HEADERS;

    // A single realistic example row so the expected format is obvious.
    const example = [
      {
        handle: "sample-ceramic-mug",
        name: "Sample Ceramic Mug",
        description: "<p>Replace this row with your own product.</p>",
        price: 299,
        compareAtPrice: 349,
        category: "Drinkware",
        productType: "Mug",
        vendor: "TCL",
        tags: ["Sample", "Gift"],
        sku: "SKU-0001",
        stock: 25,
        weight: { value: 250, unit: "g" },
        optionName: "Title",
        sizes: [],
        media: [
          {
            url: "https://example.com/mug-1.png",
            position: 1,
            alt: "Sample mug front",
            type: "image",
            source: "external",
          },
        ],
        seo: { title: "Sample Ceramic Mug", description: "Example SEO description." },
        status: "active",
        published: true,
      },
    ];

    if (format === "csv") {
      return sendFile(res, {
        buffer: Buffer.from(buildCsv(example, { headers }), "utf8"),
        filename: "products_import_template.csv",
        mime: "text/csv; charset=utf-8",
      });
    }

    const buffer = await buildWorkbook(example, { headers, sheetName: "Import template" });
    return sendFile(res, {
      buffer: Buffer.from(buffer),
      filename: "products_import_template.xlsx",
      mime: XLSX_MIME,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================================================== */
/* IMPORT                                                             */
/* ================================================================== */

/**
 * @desc   Import products from an uploaded .xlsx / .csv
 * @route  POST /api/products/import
 * @access Admin
 *
 * multipart/form-data:
 *   file        the spreadsheet (field name: "file")
 *   mode        "upsert" (default) | "create" | "update"
 *   dryRun      "true" validates and reports without writing anything
 *   mediaMode   "replace" (default) | "append" | "keep"
 */
const importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Attach a .xlsx or .csv file." });
    }

    const mode = ["upsert", "create", "update"].includes(req.body.mode)
      ? req.body.mode
      : "upsert";
    const dryRun = String(req.body.dryRun) === "true";
    const mediaMode = ["replace", "append", "keep"].includes(req.body.mediaMode)
      ? req.body.mediaMode
      : "replace";

    /* ---- 1. read the sheet ---------------------------------------- */
    let rows;
    try {
      rows = await parseSheet(req.file.buffer, req.file.originalname);
    } catch (e) {
      return res.status(400).json({ message: `Could not read the file: ${e.message}` });
    }

    if (!rows.length) {
      return res.status(400).json({ message: "The file has a header row but no data rows." });
    }

    /* ---- 2. map rows to product payloads --------------------------- */
    const { products, errors } = rowsToProducts(rows);

    if (!products.length) {
      return res.status(400).json({
        message: "No valid products were found in the file.",
        summary: { rows: rows.length, created: 0, updated: 0, skipped: errors.length, failed: 0 },
        errors,
      });
    }

    /* ---- 3. write ------------------------------------------------- */
    const summary = {
      rows: rows.length,
      products: products.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      dryRun,
    };
    const created = [];
    const updated = [];

    for (const { line, payload } of products) {
      try {
        const existing = await Product.findOne({
          $or: [{ handle: payload.handle }, ...(payload.sku ? [{ sku: payload.sku }] : [])],
        });

        if (existing && mode === "create") {
          summary.skipped++;
          errors.push({
            line,
            handle: payload.handle,
            message: "Already exists and mode is create-only — skipped.",
          });
          continue;
        }

        if (!existing && mode === "update") {
          summary.skipped++;
          errors.push({
            line,
            handle: payload.handle,
            message: "Does not exist yet and mode is update-only — skipped.",
          });
          continue;
        }

        if (dryRun) {
          existing ? summary.updated++ : summary.created++;
          continue;
        }

        if (existing) {
          const next = { ...payload };

          if (mediaMode === "keep") {
            delete next.media;
          } else if (mediaMode === "append") {
            const have = new Set((existing.media || []).map((m) => m.url));
            next.media = [
              ...existing.media,
              ...payload.media.filter((m) => !have.has(m.url)),
            ].map((m, i) => ({ ...(m.toObject ? m.toObject() : m), position: i + 1 }));
          }

          Object.entries(next).forEach(([key, value]) => {
            if (value === undefined) return;
            existing.set(key, value);
          });
          await existing.save();
          updated.push(existing);
          summary.updated++;
        } else {
          const doc = await Product.create(payload);
          created.push(doc);
          summary.created++;
        }
      } catch (e) {
        summary.failed++;
        errors.push({
          line,
          handle: payload.handle,
          message: e.code === 11000 ? "Duplicate handle or SKU in the database." : e.message,
        });
      }
    }

    /* ---- 4. tell every connected client ---------------------------- */
    if (!dryRun && (summary.created || summary.updated)) {
      const io = getIO(req);
      if (io) {
        created.forEach((p) => io.emit("product:created", p));
        updated.forEach((p) => io.emit("product:updated", p));
        io.emit("products:imported", {
          created: summary.created,
          updated: summary.updated,
        });
      }
    }

    const status = summary.failed && !summary.created && !summary.updated ? 422 : 200;
    return res.status(status).json({
      message: dryRun
        ? `Validation finished: ${summary.created} would be created, ${summary.updated} would be updated.`
        : `Import finished: ${summary.created} created, ${summary.updated} updated.`,
      summary,
      errors: errors.slice(0, 200), // keep the response small on huge files
      truncatedErrors: Math.max(errors.length - 200, 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { exportProducts, downloadTemplate, importProducts };