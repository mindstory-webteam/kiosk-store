import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { btnPrimary, field, label } from "../Ui";

const emptySize = { label: "", stock: 0, sku: "", price: "" };

const slugify = (s = "") =>
  s
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Each group of fields is a section under a hairline, rather than a floating
// card — the form reads as one document instead of six stacked boxes.
const Section = ({ title, hint, children }) => (
  <section className="border-t border-rule pt-7">
    <div className="mb-5">
      <h3 className="font-display text-[17px] text-ink">{title}</h3>
      {hint && <p className="mt-1 text-[13px] text-ink/45">{hint}</p>}
    </div>
    {children}
  </section>
);

const ProductForm = ({ initial, onSubmit, submitLabel }) => {
  /* --- identity --- */
  const [name, setName] = useState(initial?.name || "");
  const [handle, setHandle] = useState(initial?.handle || "");
  const [handleTouched, setHandleTouched] = useState(!!initial?.handle);
  const [description, setDescription] = useState(initial?.description || "");

  /* --- pricing --- */
  const [price, setPrice] = useState(initial?.price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(initial?.compareAtPrice ?? "");
  const [costPerItem, setCostPerItem] = useState(initial?.costPerItem ?? "");

  /* --- classification --- */
  const [category, setCategory] = useState(initial?.category || "");
  const [productType, setProductType] = useState(initial?.productType || "");
  const [vendor, setVendor] = useState(initial?.vendor || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));

  /* --- inventory --- */
  const [sku, setSku] = useState(initial?.sku || "");
  const [barcode, setBarcode] = useState(initial?.barcode || "");
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [weightValue, setWeightValue] = useState(initial?.weight?.value ?? 0);
  const [weightUnit, setWeightUnit] = useState(initial?.weight?.unit || "g");
  const [inventoryPolicy, setInventoryPolicy] = useState(initial?.inventoryPolicy || "deny");

  /* --- variants --- */
  const [hasSizes, setHasSizes] = useState(!!initial?.sizes?.length);
  const [optionName, setOptionName] = useState(initial?.optionName || "Size");
  const [sizes, setSizes] = useState(initial?.sizes?.length ? initial.sizes : [emptySize]);

  /* --- media --- */
  const [files, setFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState(initial?.media || []);
  const [imageUrls, setImageUrls] = useState("");

  /* --- storefront --- */
  const [seoTitle, setSeoTitle] = useState(initial?.seo?.title || "");
  const [seoDescription, setSeoDescription] = useState(initial?.seo?.description || "");
  const [status, setStatus] = useState(initial?.status || "active");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onNameChange = (value) => {
    setName(value);
    if (!handleTouched) setHandle(slugify(value));
  };

  const updateSize = (idx, key, value) =>
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  const addSizeRow = () => setSizes((prev) => [...prev, { ...emptySize }]);
  const removeSizeRow = (idx) => setSizes((prev) => prev.filter((_, i) => i !== idx));
  const removeExistingMedia = (idx) =>
    setExistingMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUploading(true);
    try {
      /* 1. upload any newly selected files to Cloudinary */
      let uploadedMedia = [];
      if (files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append("files", f));
        const { data } = await api.post("/products/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedMedia = data.media;
      }

      /* 2. accept pasted external URLs too (same shape as imported media) */
      const pasted = imageUrls
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({
          url,
          publicId: "",
          source: "external",
          type: /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? "video" : "image",
          alt: "",
        }));

      const media = [...existingMedia, ...uploadedMedia, ...pasted].map((m, i) => ({
        ...m,
        position: i + 1,
      }));

      const payload = {
        handle: handle || slugify(name),
        name,
        description,
        price: Number(price),
        compareAtPrice: compareAtPrice === "" ? undefined : Number(compareAtPrice),
        costPerItem: costPerItem === "" ? undefined : Number(costPerItem),
        category,
        productType,
        vendor,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sku,
        barcode,
        stock: Number(stock),
        weight: { value: Number(weightValue) || 0, unit: weightUnit },
        inventoryPolicy,
        optionName: hasSizes ? optionName || "Size" : "Title",
        sizes: hasSizes
          ? sizes
              .filter((s) => s.label)
              .map((s) => ({
                label: s.label,
                stock: Number(s.stock) || 0,
                sku: s.sku || "",
                price: s.price === "" || s.price === undefined ? undefined : Number(s.price),
              }))
          : [],
        media,
        seo: { title: seoTitle, description: seoDescription },
        status,
        published: status === "active",
      };

      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl pb-4">
      {error && (
        <div
          role="alert"
          className="mb-7 rounded-panel border border-clay/30 bg-clay/5 px-3 py-2.5 text-[13px] text-clay"
        >
          {error}
        </div>
      )}

      <div className="space-y-8 rounded-panel border border-rule bg-porcelain p-7">
        {/* ---------------- basic ---------------- */}
        <section>
          <h3 className="mb-5 font-display text-[17px] text-ink">Name and description</h3>

          <label className={label}>Item name</label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            className={`${field} mb-5`}
          />

          <label className={label}>Handle — the web address, and the key bulk import matches on</label>
          <input
            value={handle}
            onChange={(e) => {
              setHandle(slugify(e.target.value));
              setHandleTouched(true);
            }}
            placeholder="Generated from the name"
            className={`${field} mb-5`}
          />

          <label className={label}>Description — HTML is allowed</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            className={`${field} leading-relaxed`}
          />
        </section>

        {/* ---------------- pricing ---------------- */}
        <Section title="Price">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>Selling price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={`${field} tabular-nums`}
              />
            </div>
            <div>
              <label className={label}>Was (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className={`${field} tabular-nums`}
              />
            </div>
            <div>
              <label className={label}>Cost to you (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPerItem}
                onChange={(e) => setCostPerItem(e.target.value)}
                className={`${field} tabular-nums`}
              />
            </div>
          </div>
        </Section>

        {/* ---------------- organisation ---------------- */}
        <Section
          title="Where it belongs"
          hint="Type drives the category shown in the shop, so fill it in even when Category is vague."
        >
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                placeholder="Drinkware"
                className={field}
              />
            </div>
            <div>
              <label className={label}>Type</label>
              <input
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="Mug"
                className={field}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Maker</label>
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Tags, separated by commas</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} />
            </div>
          </div>
        </Section>

        {/* ---------------- inventory ---------------- */}
        <Section title="Stock and shipping">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Barcode</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <label className={label}>Units</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={hasSizes}
                title={hasSizes ? "Added up from the variants below" : ""}
                className={`${field} tabular-nums`}
              />
            </div>
            <div>
              <label className={label}>Weight</label>
              <input
                type="number"
                min="0"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                className={`${field} tabular-nums`}
              />
            </div>
            <div>
              <label className={label}>Unit</label>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                className={field}
              >
                {["g", "kg", "lb", "oz"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>When it runs out</label>
              <select
                value={inventoryPolicy}
                onChange={(e) => setInventoryPolicy(e.target.value)}
                className={field}
              >
                <option value="deny">Stop selling</option>
                <option value="continue">Keep selling</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ---------------- variants ---------------- */}
        <Section title="Variants">
          <label className="mb-5 flex items-center gap-2.5 text-[14px] text-ink/70">
            <input
              type="checkbox"
              checked={hasSizes}
              onChange={(e) => setHasSizes(e.target.checked)}
              className="h-4 w-4 accent-[#22407A]"
            />
            This product comes in more than one option
          </label>

          {hasSizes && (
            <>
              <label className={label}>What the options are called</label>
              <input
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                placeholder="Size, Colour, Grind size"
                className={`${field} mb-5`}
              />

              {/* One labelled grid: every row shares the same column track, so
                  the fields stay in line however many variants are added. */}
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="mb-1.5 grid grid-cols-[1fr_8rem_6rem_6rem_4.5rem] gap-2.5 px-0.5">
                    <span className="text-[12px] text-ink/50">Value</span>
                    <span className="text-[12px] text-ink/50">SKU</span>
                    <span className="text-[12px] text-ink/50">Price</span>
                    <span className="text-[12px] text-ink/50">Stock</span>
                    <span className="sr-only">Remove</span>
                  </div>

                  <div className="space-y-2.5">
                    {sizes.map((s, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_8rem_6rem_6rem_4.5rem] items-center gap-2.5"
                      >
                        <input
                          placeholder="S, 500 g, Fine"
                          value={s.label}
                          onChange={(e) => updateSize(idx, "label", e.target.value)}
                          aria-label={`Variant ${idx + 1} value`}
                          className={field}
                        />
                        <input
                          value={s.sku || ""}
                          onChange={(e) => updateSize(idx, "sku", e.target.value)}
                          aria-label={`Variant ${idx + 1} SKU`}
                          className={field}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={s.price ?? ""}
                          onChange={(e) => updateSize(idx, "price", e.target.value)}
                          aria-label={`Variant ${idx + 1} price`}
                          className={`${field} tabular-nums`}
                        />
                        <input
                          type="number"
                          min="0"
                          value={s.stock}
                          onChange={(e) => updateSize(idx, "stock", e.target.value)}
                          aria-label={`Variant ${idx + 1} stock`}
                          className={`${field} tabular-nums`}
                        />
                        <button
                          type="button"
                          onClick={() => removeSizeRow(idx)}
                          aria-label={`Remove variant ${idx + 1}`}
                          className="text-left text-[13px] text-clay transition-colors hover:text-ink"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={addSizeRow}
                  className="text-[13px] text-cobalt underline-offset-[5px] hover:underline"
                >
                  Add another variant
                </button>
              </div>
            </>
          )}
        </Section>

        {/* ---------------- media ---------------- */}
        <Section title="Photographs">
          {existingMedia.length > 0 && (
            <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {existingMedia.map((m, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square overflow-hidden rounded-panel bg-white ring-1 ring-ink/5"
                >
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      className="h-full w-full object-cover"
                      alt={m.alt || ""}
                      loading="lazy"
                    />
                  ) : (
                    <video src={m.url} className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingMedia(idx)}
                    aria-label={`Remove photograph ${idx + 1}`}
                    className="absolute right-1.5 top-1.5 rounded-full bg-ink/75 px-2 py-0.5 text-[12px] text-porcelain opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    ✕
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-ink/70 py-1 text-center text-[11px] text-porcelain">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <label className={label}>Upload files</label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => setFiles(e.target.files)}
            className="mb-5 block w-full text-[13px] text-ink/60 file:mr-3 file:rounded-panel file:border file:border-ink/20 file:bg-transparent file:px-3 file:py-2 file:text-[13px] file:text-ink hover:file:border-ink"
          />

          <label className={label}>Or paste image addresses, one per line</label>
          <textarea
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            rows={2}
            placeholder="https://cdn.example.com/photo-1.png"
            className={field}
          />
          <p className="mt-2 text-[12px] text-ink/45">
            Uploads go to Cloudinary. Pasted addresses are stored as they are, the same way
            imported photographs work. The first photograph becomes the cover.
          </p>
        </Section>

        {/* ---------------- storefront ---------------- */}
        <Section title="How it appears in search">
          <label className={label}>Page title</label>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className={`${field} mb-5`}
          />

          <label className={label}>Page description</label>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={2}
            className={`${field} mb-5`}
          />

          <label className={label}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${field} w-auto`}
          >
            <option value="active">Active — visible in the shop</option>
            <option value="draft">Draft — hidden</option>
            <option value="archived">Archived — hidden</option>
          </select>
        </Section>
      </div>

      <button type="submit" disabled={uploading} className={`${btnPrimary} mt-7 w-full py-3.5`}>
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
      <div className="mb-8">
        <h2 className="font-display text-[28px] leading-tight text-ink">Add a product</h2>
        <p className="mt-1 text-[14px] text-ink/50">
          For more than a handful at a time, import a spreadsheet instead.
        </p>
      </div>
      <ProductForm onSubmit={handleCreate} submitLabel="Publish product" />
    </div>
  );
};

export default AddProduct;
export { ProductForm };