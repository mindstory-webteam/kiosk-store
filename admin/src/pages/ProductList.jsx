import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext.jsx";
import ProductImportExport from "../components/ProductImportExport.jsx";
import { btnDanger, btnPrimary, field } from "../ui";

const STATUS_STYLES = {
  active: "bg-celadon/35 text-ink",
  draft: "bg-rule/60 text-ink/70",
  archived: "bg-ink/10 text-ink/50",
};

// Imported categories can be a full taxonomy path
// ("Home & Garden > Kitchen & Dining > ... > Teapots"). Showing it whole forces
// the row to three lines and throws every other column out of alignment, so the
// cell shows the leaf and the full path lives in the tooltip.
const categoryLeaf = (value = "") => {
  const leaf = String(value).split(">").pop().trim();
  return leaf || "—";
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const socket = useSocket();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/products?${params.toString()}`);
      setProducts(data.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    const events = [
      "product:created",
      "product:updated",
      "product:deleted",
      "product:stockUpdated",
      "products:imported",
    ];
    events.forEach((e) => socket.on(e, refresh));
    return () => events.forEach((e) => socket.off(e, refresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, statusFilter]);

  const quickStockUpdate = async (id, newStock) => {
    await api.patch(`/products/${id}/stock`, { stock: newStock });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await api.delete(`/products/${id}`);
  };

  // Client-side filter — the list is already fully loaded.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.handle, p.category, p.vendor, ...(p.tags || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, query]);

  const th = "px-4 py-3 text-[12px] font-normal text-ink/50 align-middle";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] leading-tight text-ink">Products</h2>
          <p className="mt-1 text-[14px] text-ink/50">
            Edit stock inline — changes reach the shop immediately.
          </p>
        </div>
        <Link to="/products/new" className={btnPrimary}>
          Add product
        </Link>
      </div>

      <ProductImportExport onImported={load} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, SKU, handle, vendor or tag"
          aria-label="Search products"
          className={`${field} w-full sm:w-80`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={`${field} w-auto`}
        >
          <option value="">Active only</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-[13px] tabular-nums text-ink/40">
          {visible.length} of {products.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-panel border border-rule bg-porcelain">
        {/* table-fixed + colgroup keeps every column the same width on every
            row, however long the text in a cell turns out to be */}
        <table className="w-full min-w-[1040px] table-fixed text-left">
          <colgroup>
            <col className="w-[280px]" />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col className="w-[120px]" />
            <col className="w-[92px]" />
            <col className="w-[130px]" />
            <col className="w-[96px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead className="border-b border-rule">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>SKU</th>
              <th className={th}>Category</th>
              <th className={th}>Price</th>
              <th className={`${th} text-center`}>Stock</th>
              <th className={th}>Variants</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-[14px] text-ink/40">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <p className="font-display text-[18px] text-ink">
                    {products.length ? "Nothing matches that search" : "No products yet"}
                  </p>
                  <p className="mt-1.5 text-[14px] text-ink/50">
                    {products.length
                      ? "Try a different term, or clear the search."
                      : "Add one by hand, or import a spreadsheet above."}
                  </p>
                </td>
              </tr>
            )}

            {visible.map((p) => (
              <tr key={p._id} className="h-[68px] transition-colors hover:bg-white/50">
                <td className="px-4 align-middle">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-panel bg-white ring-1 ring-ink/5">
                      {p.media?.[0]?.type === "image" && (
                        <img
                          src={p.media[0].url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-display text-[15px] text-ink" title={p.name}>
                        {p.name}
                      </div>
                      <div className="truncate text-[12px] text-ink/40">{p.handle}</div>
                    </div>
                  </div>
                </td>

                <td className="truncate px-4 align-middle text-[13px] tabular-nums text-ink/70">
                  {p.sku || "—"}
                </td>

                <td className="px-4 align-middle">
                  <span
                    className="block truncate text-[14px] text-ink/70"
                    title={p.categoryPath || p.category}
                  >
                    {categoryLeaf(p.category)}
                  </span>
                </td>

                <td className="px-4 align-middle text-[14px] tabular-nums text-ink/75">
                  <span className="whitespace-nowrap">₹{p.price}</span>
                  {p.compareAtPrice ? (
                    <span className="ml-1.5 whitespace-nowrap text-[12px] text-ink/35 line-through">
                      ₹{p.compareAtPrice}
                    </span>
                  ) : null}
                </td>

                <td className="px-4 align-middle">
                  <input
                    type="number"
                    min="0"
                    defaultValue={p.stock}
                    disabled={!!p.sizes?.length}
                    aria-label={`Stock for ${p.name}`}
                    title={p.sizes?.length ? "Stock is the sum of the variants" : ""}
                    onBlur={(e) => quickStockUpdate(p._id, Number(e.target.value))}
                    className={`${field} w-full px-1 py-1.5 text-center tabular-nums`}
                  />
                </td>

                <td className="px-4 align-middle">
                  <span
                    className="block truncate text-[14px] text-ink/70"
                    title={p.sizes?.length ? p.sizes.map((s) => s.label).join(", ") : ""}
                  >
                    {p.sizes?.length ? p.sizes.map((s) => s.label).join(", ") : "—"}
                  </span>
                </td>

                <td className="px-4 align-middle">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] ${
                      STATUS_STYLES[p.status] || STATUS_STYLES.active
                    }`}
                  >
                    {p.status || "active"}
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 text-right align-middle">
                  <Link
                    to={`/products/${p._id}/edit`}
                    className="mr-4 text-[13px] text-ink/70 underline-offset-[5px] transition-colors hover:text-cobalt hover:underline"
                  >
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(p._id)} className={btnDanger}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductList;