import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext.jsx";
import { btnPrimary } from "../ui";

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
    { label: "Products", value: products.length },
    { label: "Units in stock", value: totalStock },
    { label: "Running low", value: lowStock, alert: lowStock > 0 },
    { label: "Categories", value: categories },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] leading-tight text-ink">Dashboard</h2>
          <p className="mt-1 text-[14px] text-ink/50">
            Figures update as the shop sells and as you edit.
          </p>
        </div>
        <Link to="/products/new" className={btnPrimary}>
          Add product
        </Link>
      </div>

      {/* figures — the numbers carry the weight, labels stay quiet */}
      <div className="mb-9 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-rule bg-rule sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-porcelain px-5 py-6">
            <p
              className={`font-display text-[32px] leading-none tabular-nums ${
                c.alert ? "text-clay" : "text-ink"
              }`}
            >
              {c.value}
            </p>
            <p className="mt-2 text-[13px] text-ink/50">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-panel border border-rule bg-porcelain">
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h3 className="font-display text-[16px] text-ink">Recently added</h3>
          <Link
            to="/products"
            className="text-[13px] text-ink/55 underline-offset-[5px] transition-colors hover:text-cobalt hover:underline"
          >
            All products
          </Link>
        </div>

        {loading ? (
          <ul className="divide-y divide-rule">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex h-[68px] items-center gap-4 px-5">
                <div className="h-11 w-11 animate-pulse rounded-panel bg-kaolin" />
                <div className="h-3 w-48 animate-pulse rounded bg-kaolin" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-rule">
            {products.slice(0, 6).map((p) => (
              <li key={p._id} className="flex h-[68px] items-center justify-between gap-4 px-5">
                <Link
                  to={`/products/${p._id}/edit`}
                  className="flex min-w-0 items-center gap-4 transition-opacity hover:opacity-70"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-panel bg-white ring-1 ring-ink/5">
                    {p.media?.[0] && p.media[0].type === "image" && (
                      <img
                        src={p.media[0].url}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] text-ink">{p.name}</p>
                    <p className="truncate text-[12px] text-ink/45">
                      {p.vendor || p.category}
                    </p>
                  </div>
                </Link>
                <div className="w-28 shrink-0 text-right">
                  <p className="font-display text-[15px] tabular-nums text-ink">₹{p.price}</p>
                  <p
                    className={`text-[12px] tabular-nums ${
                      p.stock <= 5 ? "text-clay" : "text-ink/45"
                    }`}
                  >
                    {p.stock} in stock
                  </p>
                </div>
              </li>
            ))}
            {products.length === 0 && (
              <li className="px-5 py-14 text-center">
                <p className="font-display text-[18px] text-ink">No products yet</p>
                <p className="mt-1.5 text-[14px] text-ink/50">
                  Add one by hand, or import a spreadsheet from the Products page.
                </p>
                <Link to="/products/new" className={`${btnPrimary} mt-6`}>
                  Add the first product
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;