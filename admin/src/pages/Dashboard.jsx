import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext.jsx";

const Dashboard = () => {
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

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStock = products.filter((p) => p.stock <= 5).length;
  const categories = new Set(products.map((p) => p.category)).size;

  const cards = [
    { label: "Total products", value: products.length },
    { label: "Total stock units", value: totalStock },
    { label: "Low stock (≤5)", value: lowStock },
    { label: "Categories", value: categories },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-teal-950">Dashboard</h2>
        <Link
          to="/products/new"
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-teal-950 hover:bg-amber-600"
        >
          + Add Product
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-teal-700/20 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-teal-700/70">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-teal-950">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-teal-700/20 bg-white shadow-sm">
        <div className="border-b border-teal-700/10 px-5 py-4">
          <h3 className="font-semibold text-teal-950">Recently added</h3>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-teal-900/60">Loading...</p>
        ) : (
          <ul className="divide-y divide-teal-700/10">
            {products.slice(0, 6).map((p) => (
              <li key={p._id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-md bg-teal-100">
                    {p.media?.[0] && p.media[0].type === "image" && (
                      <img src={p.media[0].url} alt={p.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-teal-950">{p.name}</p>
                    <p className="text-xs text-teal-900/50">{p.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-teal-950">₹{p.price}</p>
                  <p className="text-xs text-teal-900/50">Stock: {p.stock}</p>
                </div>
              </li>
            ))}
            {products.length === 0 && (
              <li className="px-5 py-6 text-sm text-teal-900/50">No products yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
