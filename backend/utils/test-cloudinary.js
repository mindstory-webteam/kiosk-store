// Standalone diagnostic — run with: node utils/test-cloudinary.js
// Confirms your Cloudinary credentials actually work, independent of Express/Multer.
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

console.log("Using:");
console.log("  CLOUDINARY_CLOUD_NAME =", JSON.stringify(process.env.CLOUDINARY_CLOUD_NAME));
console.log("  CLOUDINARY_API_KEY    =", JSON.stringify(process.env.CLOUDINARY_API_KEY));
console.log("  CLOUDINARY_API_SECRET =", process.env.CLOUDINARY_API_SECRET ? "(set, hidden)" : "(MISSING)");
console.log("");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api
  .ping()
  .then((res) => {
    console.log("✅ SUCCESS — Cloudinary credentials are valid:", res);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ FAILED — Cloudinary rejected these credentials.");
    console.error(err);
    process.exit(1);
  });
