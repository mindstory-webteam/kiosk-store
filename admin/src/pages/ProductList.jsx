import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext.jsx";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/products?limit=1000");
    setProducts(data.products);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("product:created", refresh);
    socket.on("product:updated", refresh);
    socket.on("product:deleted", refresh);
    socket.on("product:stockUpdated", refresh);
    return () => {
      socket.off("product:created", refresh);
      socket.off("product:updated", refresh);
      socket.off("product:deleted", refresh);
      socket.off("product:stockUpdated", refresh);
    };
  }, [socket]);

  const quickStockUpdate = async (id, newStock) => {
    await api.patch(`/products/${id}/stock`, { stock: newStock });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await api.delete(`/products/${id}`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-teal-950">Products</h2>
        <Link
          to="/products/new"
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-teal-950 hover:bg-amber-600"
        >
          + Add Product
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-teal-700/20 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50 text-teal-900/70">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Sizes</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-700/10">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-900/50">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-900/50">
                  No products yet.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p._id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-teal-100">
                      {p.media?.[0]?.type === "image" && (
                        <img src={p.media[0].url} alt={p.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="font-medium text-teal-950">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-teal-900/70">{p.category}</td>
                <td className="px-4 py-3 text-teal-900/70">₹{p.price}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    defaultValue={p.stock}
                    onBlur={(e) => quickStockUpdate(p._id, Number(e.target.value))}
                    className="w-20 rounded-md border border-teal-700/30 px-2 py-1 text-sm outline-none focus:border-amber-500"
                  />
                </td>
                <td className="px-4 py-3 text-teal-900/70">
                  {p.sizes?.length ? p.sizes.map((s) => s.label).join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/products/${p._id}/edit`} className="mr-3 text-sm font-medium text-teal-700 hover:underline">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="text-sm font-medium text-red-500 hover:underline"
                  >
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
