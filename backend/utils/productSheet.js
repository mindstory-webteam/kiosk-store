/**
 * productSheet.js
 * ---------------------------------------------------------------------------
 * Everything that knows about the spreadsheet column layout lives here, so the
 * controllers stay thin. The header order is the Shopify product-export layout
 * (the one in products_export.csv), which means:
 *
 *   - a file exported from Shopify imports here unchanged
 *   - a file exported from here re-imports here unchanged (lossless round-trip)
 *
 * Layout rules of that format:
 *   - rows are grouped by `Handle`
 *   - the FIRST row of a handle carries the product fields
 *   - following rows with the same handle carry extra variants and/or images
 *     and leave every other column blank
 */

const ExcelJS = require("exceljs");
const { parse: parseCsv } = require("csv-parse/sync");

/* ------------------------------------------------------------------ */
/* 1. column layout                                                    */
/* ------------------------------------------------------------------ */

const HEADERS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option1 Linked To",
  "Option2 Name",
  "Option2 Value",
  "Option2 Linked To",
  "Option3 Name",
  "Option3 Value",
  "Option3 Linked To",
  "Variant SKU",
  "Variant Grams",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Unit Price Total Measure",
  "Unit Price Total Measure Unit",
  "Unit Price Base Measure",
  "Unit Price Base Measure Unit",
  "Variant Barcodes",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "Gift Card",
  "SEO Title",
  "SEO Description",
  "Google Shopping / Google Product Category",
  "Google Shopping / Gender",
  "Google Shopping / Age Group",
  "Google Shopping / MPN",
  "Google Shopping / Condition",
  "Google Shopping / Custom Product",
  "Google Shopping / Custom Label 0",
  "Google Shopping / Custom Label 1",
  "Google Shopping / Custom Label 2",
  "Google Shopping / Custom Label 3",
  "Google Shopping / Custom Label 4",
  "FAQs (product.metafields.koffynex.p_faqs)",
  "Sub name (product.metafields.koffynex.sub_name)",
  "Google: Custom Product (product.metafields.mm-google-shopping.custom_product)",
  "Product rating count (product.metafields.reviews.rating_count)",
  "Grind size (product.metafields.shopify.grind-size)",
  "Complementary products (product.metafields.shopify--discovery--product_recommendation.complementary_products)",
  "Related products (product.metafields.shopify--discovery--product_recommendation.related_products)",
  "Related products settings (product.metafields.shopify--discovery--product_recommendation.related_products_display)",
  "Search product boosts (product.metafields.shopify--discovery--product_search_boost.queries)",
  "Variant Image",
  "Variant Weight Unit",
  "Variant Tax Code",
  "Cost per item",
  "Status",
];

// Columns we read into real schema fields. Everything else that has a value is
// stashed in product.metafields and written back out on export.
const MAPPED = new Set([
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant SKU",
  "Variant Grams",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Variant Barcodes",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "Gift Card",
  "SEO Title",
  "SEO Description",
  "FAQs (product.metafields.koffynex.p_faqs)",
  "Sub name (product.metafields.koffynex.sub_name)",
  "Variant Image",
  "Variant Weight Unit",
  "Variant Tax Code",
  "Cost per item",
  "Status",
]);

// A minimal set an admin can fill in by hand. Used by the template endpoint.
const TEMPLATE_HEADERS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant SKU",
  "Variant Inventory Qty",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Grams",
  "Variant Weight Unit",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "SEO Title",
  "SEO Description",
  "Status",
];

/* ------------------------------------------------------------------ */
/* 2. tiny coercion helpers                                            */
/* ------------------------------------------------------------------ */

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());

const num = (v, fallback = undefined) => {
  const s = str(v).replace(/[₹$,\s]/g, "");
  if (s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (v, fallback = false) => {
  const s = str(v).toLowerCase();
  if (["true", "yes", "y", "1", "active", "published"].includes(s)) return true;
  if (["false", "no", "n", "0", "draft", "unpublished"].includes(s)) return false;
  return fallback;
};

const list = (v, sep = ",") =>
  str(v)
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isVideo = (url = "") => /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);

const WEIGHT_UNITS = ["g", "kg", "lb", "oz"];

/* ------------------------------------------------------------------ */
/* 3. reading an uploaded file                                         */
/* ------------------------------------------------------------------ */

/** Flatten whatever ExcelJS hands back for a cell into a plain string. */
const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join("");
    if (value.text !== undefined) return String(value.text);
    if (value.hyperlink !== undefined) return String(value.hyperlink);
    if (value.result !== undefined) return String(value.result); // formula cell
    if (value.error !== undefined) return "";
    return "";
  }
  return String(value);
};

/**
 * Parse an uploaded .xlsx / .xls / .csv buffer into an array of
 * `{ "Column Name": "value" }` objects. Header keys are trimmed.
 */
const parseSheet = async (buffer, originalname = "") => {
  const ext = (originalname.split(".").pop() || "").toLowerCase();

  if (ext === "csv" || ext === "txt" || ext === "tsv") {
    return parseCsv(buffer.toString("utf8"), {
      columns: (header) => header.map((h) => str(h)),
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      bom: true,
      delimiter: ext === "tsv" ? "\t" : ",",
    });
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The uploaded workbook does not contain any sheets.");

  const headers = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = str(cellText(cell.value));
  });

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    let blank = true;
    headers.forEach((header, col) => {
      if (!header) return;
      const text = cellText(row.getCell(col).value);
      if (str(text) !== "") blank = false;
      obj[header] = text;
    });
    if (!blank) rows.push(obj);
  });

  return rows;
};

/* ------------------------------------------------------------------ */
/* 4. rows  ->  product payloads                                       */
/* ------------------------------------------------------------------ */

/** Case-insensitive, whitespace-tolerant column lookup for one row. */
const reader = (row) => {
  const index = new Map();
  Object.keys(row || {}).forEach((k) => index.set(str(k).toLowerCase(), k));
  return (column) => {
    const key = index.get(str(column).toLowerCase());
    return key === undefined ? "" : row[key];
  };
};

/**
 * Turn raw sheet rows into product payloads ready for create/update.
 * Returns { products, errors } — errors carry the 1-based sheet line number.
 */
const rowsToProducts = (rows) => {
  const errors = [];
  const groups = new Map();

  rows.forEach((raw, i) => {
    const line = i + 2; // +1 for the header row, +1 for 1-based numbering
    const get = reader(raw);
    const handle = str(get("Handle")) || slugify(get("Title"));
    if (!handle) {
      errors.push({ line, handle: "", message: "Row has neither a Handle nor a Title — skipped." });
      return;
    }
    if (!groups.has(handle)) groups.set(handle, []);
    groups.get(handle).push({ get, line });
  });

  const products = [];

  for (const [handle, entries] of groups) {
    // The product row is the first one that actually carries a Title.
    const head = entries.find((e) => str(e.get("Title"))) || entries[0];
    const get = head.get;
    const line = head.line;

    const name = str(get("Title"));
    if (!name) {
      errors.push({ line, handle, message: "No Title found for this handle — skipped." });
      continue;
    }

    /* ---- media: every row of the group can contribute an image ---- */
    const seen = new Set();
    const media = [];
    entries.forEach((e) => {
      const url = str(e.get("Image Src"));
      if (!url || seen.has(url)) return;
      seen.add(url);
      media.push({
        url,
        publicId: "",
        source: "external",
        type: isVideo(url) ? "video" : "image",
        position: num(e.get("Image Position"), media.length + 1),
        alt: str(e.get("Image Alt Text")),
      });
    });
    media.sort((a, b) => a.position - b.position);
    media.forEach((m, i) => (m.position = i + 1));

    /* ---- variants ------------------------------------------------- */
    const optionName = str(get("Option1 Name")) || "Title";
    const variantRows = entries.filter(
      (e) => str(e.get("Option1 Value")) || str(e.get("Variant SKU"))
    );
    // "Title / Default Title" is Shopify's way of saying "no real options".
    const singleVariant =
      variantRows.length <= 1 ||
      /^title$/i.test(optionName) ||
      variantRows.every((e) => /^default title$/i.test(str(e.get("Option1 Value"))));

    const sizes = singleVariant
      ? []
      : variantRows.map((e) => ({
          label: str(e.get("Option1 Value")),
          stock: num(e.get("Variant Inventory Qty"), 0),
          sku: str(e.get("Variant SKU")),
          barcode: str(e.get("Variant Barcodes")),
          price: num(e.get("Variant Price")),
          compareAtPrice: num(e.get("Variant Compare At Price")),
          grams: num(e.get("Variant Grams")),
          imageUrl: str(e.get("Variant Image")),
        }));

    /* ---- price / stock -------------------------------------------- */
    const variantPrices = sizes.map((s) => s.price).filter((p) => Number.isFinite(p));
    const price = num(get("Variant Price"), variantPrices.length ? Math.min(...variantPrices) : undefined);

    if (price === undefined) {
      errors.push({ line, handle, message: "Variant Price is missing or not a number — skipped." });
      continue;
    }

    const stock = sizes.length
      ? sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
      : num(get("Variant Inventory Qty"), 0);

    /* ---- description / category ----------------------------------- */
    const description = str(get("Body (HTML)")) || name;
    const category = str(get("Product Category")) || str(get("Type")) || "Uncategorized";

    /* ---- weight ---------------------------------------------------- */
    const rawUnit = str(get("Variant Weight Unit")).toLowerCase();
    const unit = WEIGHT_UNITS.includes(rawUnit) ? rawUnit : "g";

    /* ---- status ---------------------------------------------------- */
    const rawStatus = str(get("Status")).toLowerCase();
    const status = ["active", "draft", "archived"].includes(rawStatus) ? rawStatus : "active";
    const published = bool(get("Published"), status === "active");

    /* ---- leftover columns become metafields ------------------------ */
    const metafields = {};
    HEADERS.forEach((h) => {
      if (MAPPED.has(h)) return;
      const v = str(get(h));
      if (v) metafields[h] = v;
    });

    products.push({
      line,
      payload: {
        handle,
        name,
        subName: str(get("Sub name (product.metafields.koffynex.sub_name)")),
        description,
        price,
        compareAtPrice: num(get("Variant Compare At Price")),
        costPerItem: num(get("Cost per item")),
        category,
        productType: str(get("Type")),
        vendor: str(get("Vendor")),
        tags: list(get("Tags")),
        sku: str(get("Variant SKU")),
        barcode: str(get("Variant Barcodes")),
        stock,
        inventoryTracker: str(get("Variant Inventory Tracker")) || "shopify",
        inventoryPolicy:
          str(get("Variant Inventory Policy")).toLowerCase() === "continue" ? "continue" : "deny",
        fulfillmentService: str(get("Variant Fulfillment Service")) || "manual",
        weight: { value: num(get("Variant Grams"), 0), unit },
        requiresShipping: bool(get("Variant Requires Shipping"), true),
        taxable: bool(get("Variant Taxable"), true),
        taxCode: str(get("Variant Tax Code")),
        giftCard: bool(get("Gift Card"), false),
        optionName,
        sizes,
        media,
        seo: {
          title: str(get("SEO Title")),
          description: str(get("SEO Description")),
        },
        faqs: list(get("FAQs (product.metafields.koffynex.p_faqs)"), ";"),
        metafields,
        status,
        published,
        isActive: status === "active",
      },
    });
  }

  return { products, errors };
};

/* ------------------------------------------------------------------ */
/* 5. product  ->  rows                                                */
/* ------------------------------------------------------------------ */

const blankRow = () => {
  const row = {};
  HEADERS.forEach((h) => (row[h] = ""));
  return row;
};

/**
 * One product becomes N rows: the first carries all product fields, and the
 * rest carry only the additional variants / images.
 */
const productToRows = (p) => {
  const media = [...(p.media || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  const variants = (p.sizes || []).length
    ? p.sizes
    : [
        {
          label: "Default Title",
          stock: p.stock,
          sku: p.sku,
          barcode: p.barcode,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          grams: p.weight?.value,
          imageUrl: "",
        },
      ];

  const optionName = (p.sizes || []).length ? p.optionName || "Size" : "Title";
  const rowCount = Math.max(variants.length, media.length, 1);
  const rows = [];

  // Mongoose Maps need .get(); plain objects from .lean() do not.
  const metafield = (key) => {
    const m = p.metafields;
    if (!m) return "";
    if (typeof m.get === "function") return m.get(key) || "";
    return m[key] || "";
  };

  for (let i = 0; i < rowCount; i++) {
    const row = blankRow();
    const variant = variants[i];
    const image = media[i];

    row.Handle = p.handle || slugify(p.name);

    if (i === 0) {
      row.Title = p.name || "";
      row["Body (HTML)"] = p.description || "";
      row.Vendor = p.vendor || "";
      row["Product Category"] = p.category || "";
      row.Type = p.productType || "";
      row.Tags = (p.tags || []).join(", ");
      row.Published = p.published === false ? "false" : "true";
      row["Gift Card"] = p.giftCard ? "true" : "false";
      row["SEO Title"] = p.seo?.title || "";
      row["SEO Description"] = p.seo?.description || "";
      row["FAQs (product.metafields.koffynex.p_faqs)"] = (p.faqs || []).join("; ");
      row["Sub name (product.metafields.koffynex.sub_name)"] = p.subName || "";
      row["Cost per item"] = p.costPerItem ?? "";
      row.Status = p.status || "active";

      HEADERS.forEach((h) => {
        if (MAPPED.has(h)) return;
        const v = metafield(h);
        if (v) row[h] = v;
      });
    }

    if (variant) {
      row["Option1 Name"] = i === 0 ? optionName : "";
      row["Option1 Value"] = variant.label || "";
      row["Variant SKU"] = variant.sku || (i === 0 ? p.sku || "" : "");
      row["Variant Grams"] = variant.grams ?? p.weight?.value ?? "";
      row["Variant Inventory Tracker"] = p.inventoryTracker || "shopify";
      row["Variant Inventory Qty"] = variant.stock ?? 0;
      row["Variant Inventory Policy"] = p.inventoryPolicy || "deny";
      row["Variant Fulfillment Service"] = p.fulfillmentService || "manual";
      row["Variant Price"] = Number(variant.price ?? p.price ?? 0).toFixed(2);
      row["Variant Compare At Price"] =
        variant.compareAtPrice ?? p.compareAtPrice ?? "";
      row["Variant Requires Shipping"] = p.requiresShipping === false ? "false" : "true";
      row["Variant Taxable"] = p.taxable === false ? "false" : "true";
      row["Variant Barcodes"] = variant.barcode || "";
      row["Variant Weight Unit"] = p.weight?.unit || "g";
      row["Variant Tax Code"] = p.taxCode || "";
      row["Variant Image"] = variant.imageUrl || "";
    }

    if (image) {
      row["Image Src"] = image.url || "";
      row["Image Position"] = image.position || i + 1;
      row["Image Alt Text"] = image.alt || "";
    }

    rows.push(row);
  }

  return rows;
};

/* ------------------------------------------------------------------ */
/* 6. writers                                                          */
/* ------------------------------------------------------------------ */

/** Build an .xlsx buffer from products (or from a bare header template). */
const buildWorkbook = async (products = [], { headers = HEADERS, sheetName = "Products" } = {}) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kiosk Stores Admin";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.min(Math.max(h.length + 4, 14), 48),
  }));

  ws.getRow(1).font = { name: "Arial", bold: true, color: { argb: "FF042F2E" } };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFCCFBF1" },
  };
  ws.getRow(1).alignment = { vertical: "middle" };
  ws.getRow(1).height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  products.forEach((p) => {
    productToRows(p).forEach((row) => {
      const picked = {};
      headers.forEach((h) => (picked[h] = row[h] ?? ""));
      ws.addRow(picked);
    });
  });

  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    row.font = { name: "Arial", size: 10 };
    row.alignment = { vertical: "top" };
  });

  return wb.xlsx.writeBuffer();
};

const csvEscape = (v) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Build a CSV string from products (or a bare header template). */
const buildCsv = (products = [], { headers = HEADERS } = {}) => {
  const lines = [headers.map(csvEscape).join(",")];
  products.forEach((p) => {
    productToRows(p).forEach((row) => {
      lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
    });
  });
  return "\uFEFF" + lines.join("\n"); // BOM keeps Excel happy with UTF-8
};

module.exports = {
  HEADERS,
  TEMPLATE_HEADERS,
  MAPPED,
  parseSheet,
  rowsToProducts,
  productToRows,
  buildWorkbook,
  buildCsv,
  slugify,
};