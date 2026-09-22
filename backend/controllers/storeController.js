const Store = require("../models/Store");

const getStores = async (req, res) => {
  try {
    const stores = await Store.find().sort({ createdAt: -1 });
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createStore = async (req, res) => {
  try {
    const { name, location, description, logo } = req.body;
    if (!name) return res.status(400).json({ message: "Store name is required" });

    const store = await Store.create({ name, location, description, logo, owner: req.user._id });

    const io = req.app.get("io");
    if (io) io.emit("store:created", store);

    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });

    ["name", "location", "description", "logo"].forEach((f) => {
      if (req.body[f] !== undefined) store[f] = req.body[f];
    });
    await store.save();

    const io = req.app.get("io");
    if (io) io.emit("store:updated", store);

    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    await store.deleteOne();

    const io = req.app.get("io");
    if (io) io.emit("store:deleted", { _id: store._id });

    res.json({ message: "Store deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStores, createStore, updateStore, deleteStore };
