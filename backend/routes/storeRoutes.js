const express = require("express");
const { getStores, createStore, updateStore, deleteStore } = require("../controllers/storeController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", getStores);
router.post("/", protect, adminOnly, createStore);
router.put("/:id", protect, adminOnly, updateStore);
router.delete("/:id", protect, adminOnly, deleteStore);

module.exports = router;
