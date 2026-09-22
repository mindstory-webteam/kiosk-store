import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const emptySize = { label: "", stock: 0 };

const ProductForm = ({ initial, onSubmit, submitLabel }) => {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [category, setCategory] = useState(initial?.category || "");
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [hasSizes, setHasSizes] = useState(!!initial?.sizes?.length);
  const [sizes, setSizes] = useState(initial?.sizes?.length ? initial.sizes : [emptySize]);
  const [files, setFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState(initial?.media || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const updateSize = (idx, field, value) => {
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addSizeRow = () => setSizes((prev) => [...prev, { ...emptySize }]);
  const removeSizeRow = (idx) => setSizes((prev) => prev.filter((_, i) => i !== idx));
  const removeExistingMedia = (idx) =>
    setExistingMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUploading(true);
    try {
      let uploadedMedia = [];
      if (files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append("files", f));
        const { data } = await api.post("/products/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedMedia = data.media;
      }

      const payload = {
        name,
        description,
        price: Number(price),
        category,
        stock: Number(stock),
        sizes: hasSizes ? sizes.filter((s) => s.label).map((s) => ({ label: s.label, stock: Number(s.stock) })) : [],
        media: [...existingMedia, ...uploadedMedia],
      };

      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="rounded-xl border border-teal-700/20 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-teal-950">Basic details</h3>

        <label className="mb-1 block text-xs font-medium text-teal-900/70">Item name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-4 w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
        />

        <label className="mb-1 block text-xs font-medium text-teal-900/70">Specification / Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          className="mb-4 w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
        />

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-teal-900/70">Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-teal-900/70">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder="e.g. Footwear"
              className="w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <label className="mb-1 block text-xs font-medium text-teal-900/70">Overall stock balance</label>
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          required
          className="w-full rounded-md border border-teal-700/30 px-3 py-2 outline-none focus:border-amber-500"
        />
      </div>

      <div className="rounded-xl border border-teal-700/20 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-teal-950">Available sizes</h3>
          <label className="flex items-center gap-2 text-sm text-teal-900/70">
            <input type="checkbox" checked={hasSizes} onChange={(e) => setHasSizes(e.target.checked)} />
            This product has sizes
          </label>
        </div>

        {hasSizes && (
          <div className="space-y-2">
            {sizes.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  placeholder="Size (S, M, L, 42...)"
                  value={s.label}
                  onChange={(e) => updateSize(idx, "label", e.target.value)}
                  className="flex-1 rounded-md border border-teal-700/30 px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Stock"
                  value={s.stock}
                  onChange={(e) => updateSize(idx, "stock", e.target.value)}
                  className="w-28 rounded-md border border-teal-700/30 px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => removeSizeRow(idx)}
                  className="rounded-md px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSizeRow}
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              + Add size
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-teal-700/20 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-teal-950">Photos &amp; videos</h3>

        {existingMedia.length > 0 && (
          <div className="mb-4 grid grid-cols-4 gap-3">
            {existingMedia.map((m, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-md border border-teal-700/20">
                {m.type === "image" ? (
                  <img src={m.url} className="h-20 w-full object-cover" alt="" />
                ) : (
                  <video src={m.url} className="h-20 w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeExistingMedia(idx)}
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => setFiles(e.target.files)}
          className="block w-full text-sm text-teal-900/70 file:mr-4 file:rounded-md file:border-0 file:bg-teal-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-800 hover:file:bg-teal-200"
        />
        <p className="mt-2 text-xs text-teal-900/50">Each product can have multiple images and videos.</p>
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-teal-950 hover:bg-amber-600 disabled:opacity-60"
      >
        {uploading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
};

const AddProduct = () => {
  const navigate = useNavigate();

  const handleCreate = async (payload) => {
    await api.post("/products", payload);
    navigate("/products");
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-teal-950">Add product</h2>
      <ProductForm onSubmit={handleCreate} submitLabel="Publish product" />
    </div>
  );
};

export default AddProduct;
export { ProductForm };
