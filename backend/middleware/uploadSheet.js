const multer = require("multer");
const path = require("path");

/**
 * Spreadsheets are parsed in-process and never persisted, so memoryStorage is
 * the right fit here (unlike middleware/upload.js, which streams product media
 * straight to Cloudinary).
 */
const ALLOWED_EXT = [".xlsx", ".xls", ".csv", ".tsv"];

const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls (and some browsers for .csv)
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
  "application/csv",
  "application/octet-stream", // some browsers send this for .xlsx
];

const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
      return cb(null, true);
    }
    if (ALLOWED_EXT.includes(ext)) return cb(null, true); // trust the extension
    cb(new Error("Only .xlsx, .xls, .csv or .tsv files can be imported."));
  },
});

module.exports = uploadSheet;