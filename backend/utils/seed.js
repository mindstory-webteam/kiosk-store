// Run with: npm run seed
// Creates a default admin account so you can log into the admin panel immediately.
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");

const run = async () => {
  await connectDB();

  const email = "admin@kiosk.com";
  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  await User.create({
    name: "Super Admin",
    email,
    password: "Admin@123",
    role: "admin",
  });

  console.log("Admin created:");
  console.log("  email:    admin@kiosk.com");
  console.log("  password: Admin@123");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
