"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";

export default function HomePage() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  // No account? Send them to the login page - products only show once signed in.
  useEffect(() => {
    if (!initializing && !user) router.replace("/login");
  }, [initializing, user, router]);

  const loadProducts = async (params: { search?: string; category?: string } = {}) => {
    setLoading(true);
    const { data } = await api.get("/products", { params: { ...params, limit: 100 } });
    setProducts(data.products);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadProducts();
    api.get("/products/categories").then(({ data }) => setCategories(data));
  }, [user]);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [user]);

  // Live updates via Socket.io - reflects admin panel changes instantly
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleCreated = (product: Product) => setProducts((prev) => [product, ...prev]);
    const handleUpdated = (product: Product) =>
      setProducts((prev) => prev.map((p) => (p._id === product._id ? product : p)));
    const handleStock = (payload: { _id: string; stock: number; sizes: Product["sizes"] }) =>
      setProducts((prev) =>
        prev.map((p) => (p._id === payload._id ? { ...p, stock: payload.stock, sizes: payload.sizes } : p))
      );
    const handleDeleted = (payload: { _id: string }) =>
      setProducts((prev) => prev.filter((p) => p._id !== payload._id));

    socket.on("product:created", handleCreated);
    socket.on("product:updated", handleUpdated);
    socket.on("product:stockUpdated", handleStock);
    socket.on("product:deleted", handleDeleted);

    return () => {
      socket.off("product:created", handleCreated);
      socket.off("product:updated", handleUpdated);
      socket.off("product:stockUpdated", handleStock);
      socket.off("product:deleted", handleDeleted);
    };
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts({ search, category: activeCategory });
  };

  const handleCategory = (cat: string) => {
    const next = cat === activeCategory ? "" : cat;
    setActiveCategory(next);
    loadProducts({ search, category: next });
  };

  // Signed-out visitors are being redirected to /login - render nothing meanwhile.
  if (initializing || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center text-teal-900/40">Loading...</div>;
  }

  return (
    <div>
      <section className="border-b border-teal-700/10 bg-teal-950">
        <div ref={heroRef} className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-widest text-amber-500">Live from the kiosks</p>
          <h1 className="mt-2 max-w-xl text-4xl font-extrabold leading-tight text-cloud">
            Everything your local kiosk stores have in stock, right now.
          </h1>
          <form onSubmit={handleSearch} className="mt-8 flex max-w-md gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-md border border-teal-700 bg-teal-900 px-4 py-2.5 text-cloud placeholder:text-cloud/40 outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-md bg-amber-500 px-5 py-2.5 font-semibold text-teal-950 hover:bg-amber-600"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "border-teal-950 bg-teal-950 text-cloud"
                    : "border-teal-700/20 text-teal-900/70 hover:border-teal-700/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-teal-900/50">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-teal-900/50">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product._id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
