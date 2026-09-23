"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";
import { coverMedia, formatPrice, productHref } from "@/lib/product";

type Filters = { search?: string; category?: string; vendor?: string; tag?: string };

const SORTS = [
  { value: "-createdAt", label: "Latest in" },
  { value: "price", label: "Price, low first" },
  { value: "-price", label: "Price, high first" },
  { value: "name", label: "Alphabetical" },
];

const FEATURE_COUNT = 5;   // how many pieces take a turn in the hero
const DWELL_MS = 6000;     // how long each one stays

export default function HomePage() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [activeVendor, setActiveVendor] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLElement>(null);

  // No account? Send them to the login page - products only show once signed in.
  useEffect(() => {
    if (!initializing && !user) router.replace("/login");
  }, [initializing, user, router]);

  const loadProducts = useCallback(
    async (overrides: Filters = {}) => {
      setLoading(true);
      try {
        const params = {
          limit: 100,
          sort,
          search: overrides.search ?? search,
          category: overrides.category ?? activeCategory,
          vendor: overrides.vendor ?? activeVendor,
          ...overrides,
        };
        // Drop empty values so the backend doesn't filter on "".
        Object.keys(params).forEach((k) => {
          const key = k as keyof typeof params;
          if (params[key] === "" || params[key] === undefined) delete params[key];
        });
        const { data } = await api.get("/products", { params });
        setProducts(data.products);
      } finally {
        setLoading(false);
      }
    },
    [search, activeCategory, activeVendor, sort]
  );

  const loadFacets = useCallback(() => {
    api.get("/products/categories").then(({ data }) => setCategories(data)).catch(() => undefined);
    // Added alongside the import feature — safe to ignore if the route is absent.
    api.get("/products/vendors").then(({ data }) => setVendors(data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadProducts();
    loadFacets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Live updates via Socket.io - reflects admin panel changes instantly
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleCreated = (product: Product) => setProducts((prev) => [product, ...prev]);
    const handleUpdated = (product: Product) =>
      setProducts((prev) => prev.map((p) => (p._id === product._id ? product : p)));
    const handleStock = (payload: { _id: string; stock: number; sizes: Product["sizes"] }) =>
      setProducts((prev) =>
        prev.map((p) =>
          p._id === payload._id ? { ...p, stock: payload.stock, sizes: payload.sizes } : p
        )
      );
    const handleDeleted = (payload: { _id: string }) =>
      setProducts((prev) => prev.filter((p) => p._id !== payload._id));
    const handleImported = () => {
      loadProducts();
      loadFacets();
    };

    socket.on("product:created", handleCreated);
    socket.on("product:updated", handleUpdated);
    socket.on("product:stockUpdated", handleStock);
    socket.on("product:deleted", handleDeleted);
    socket.on("products:imported", handleImported);

    return () => {
      socket.off("product:created", handleCreated);
      socket.off("product:updated", handleUpdated);
      socket.off("product:stockUpdated", handleStock);
      socket.off("product:deleted", handleDeleted);
      socket.off("products:imported", handleImported);
    };
  }, [user, loadProducts, loadFacets]);

  /* ------------------------------------------------ the rotating showcase */

  // The pieces that take a turn in the hero. Held in their own state so that
  // filtering the grid below doesn't reshuffle what's on show above.
  const [featured, setFeatured] = useState<Product[]>([]);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (featured.length || !products.length) return;
    setFeatured(products.filter((p) => coverMedia(p)).slice(0, FEATURE_COUNT));
  }, [products, featured.length]);

  // Keep the showcase in step with live edits without restarting the rotation.
  useEffect(() => {
    if (!featured.length) return;
    setFeatured((prev) =>
      prev
        .map((f) => products.find((p) => p._id === f._id) ?? f)
        .filter((f) => products.some((p) => p._id === f._id))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const current = featured[slide] ?? null;

  // Auto-advance. Stops while hovered or focused, and never runs for people
  // who have asked for reduced motion.
  useEffect(() => {
    if (paused || featured.length < 2) return;
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(
      () => setSlide((s) => (s + 1) % featured.length),
      DWELL_MS
    );
    return () => window.clearTimeout(timer);
  }, [slide, paused, featured.length]);

  // One orchestrated reveal when the page first settles.
  useEffect(() => {
    if (!current || !heroRef.current) return;
    const context = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-hero-line]", { yPercent: 105, duration: 0.9, stagger: 0.07 })
        .from("[data-hero-meta]", { opacity: 0, y: 10, duration: 0.6 }, "-=0.5")
        .from("[data-hero-plate]", { opacity: 0, scale: 1.03, duration: 1.1 }, "-=0.9");
    }, heroRef);
    return () => context.revert();
    // Runs once, on the first piece only — later slides cross-fade instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!current]);

  /* ------------------------------------------------ filters */

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleCategory = (cat: string) => {
    const next = cat === activeCategory ? "" : cat;
    setActiveCategory(next);
    loadProducts({ category: next });
  };

  const clearFilters = () => {
    setActiveCategory("");
    setActiveVendor("");
    setSearch("");
    loadProducts({ category: "", vendor: "", search: "" });
  };

  const hasFilters = !!(activeCategory || activeVendor || search);

  // "Uncategorized" is an import placeholder, not a shelf anyone would choose.
  const shelves = useMemo(
    () => categories.filter((c) => c && !/^uncategorized$/i.test(c)),
    [categories]
  );

  if (initializing || !user) {
    return <div className="min-h-[60vh] bg-kaolin" />;
  }

  return (
    <div className="bg-kaolin text-ink">
      {/* ------------------------------------------------ showcase */}
      {current && (
        <section
          ref={heroRef}
          className="mx-auto max-w-[88rem] px-6 pb-20 pt-14 lg:px-10 lg:pt-20"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          aria-roledescription="carousel"
          aria-label="Featured pieces"
        >
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* copy — fixed, the showcase rotates around it */}
            <div className="lg:col-span-5">
              <h1 className="font-display text-[2.6rem] leading-[1.08] tracking-[-0.015em] sm:text-[3.4rem]">
                <span className="block overflow-hidden">
                  <span data-hero-line className="block">Cups, pots and saucers</span>
                </span>
                <span className="block overflow-hidden">
                  <span data-hero-line className="block">for the way you</span>
                </span>
                <span className="block overflow-hidden">
                  <span data-hero-line className="block italic text-cobalt">actually drink.</span>
                </span>
              </h1>

              <div data-hero-meta>
                <p className="mt-7 max-w-[46ch] text-[15px] leading-relaxed text-ink/60">
                  Ceramic and bone china from kiosks near you. Stock counts come
                  straight off the shelf, so what you see here is what is left.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                  <a
                    href="#shelf"
                    className="inline-flex items-center rounded-[2px] bg-[#171E1B] px-7 py-3.5 text-[14px] font-medium leading-none text-[#F6F4F0] transition-colors hover:bg-[#22407A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22407A]"
                  >
                    See everything in stock
                  </a>
                  <Link
                    href={productHref(current)}
                    className="text-[14px] text-ink/70 underline decoration-ink/25 underline-offset-[6px] transition-colors hover:text-cobalt hover:decoration-cobalt"
                  >
                    About the {current.name}
                  </Link>
                </div>
              </div>
            </div>

            {/* the piece on show */}
            <div className="lg:col-span-7">
              <div data-hero-plate>
                <Link href={productHref(current)} className="group block focus:outline-none">
                  <div className="relative aspect-[5/4] overflow-hidden rounded-[3px] bg-porcelain ring-1 ring-ink/5 group-focus-visible:ring-2 group-focus-visible:ring-cobalt">
                    {featured.map((p, i) => {
                      const image = coverMedia(p);
                      if (!image) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p._id}
                          src={image.url}
                          alt={i === slide ? image.alt || p.name : ""}
                          aria-hidden={i !== slide}
                          loading={i === 0 ? "eager" : "lazy"}
                          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out motion-reduce:transition-none ${
                            i === slide ? "opacity-100" : "opacity-0"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-6 border-t border-rule pt-3">
                    <p className="font-display text-[15px]">
                      {current.name}
                      {current.vendor && (
                        <span className="ml-2 font-sans text-[13px] text-ink/40">
                          {current.vendor}
                        </span>
                      )}
                    </p>
                    <p className="font-display text-[15px] tabular-nums">
                      {formatPrice(current.price)}
                    </p>
                  </div>
                </Link>

                {/* which piece is on show */}
                {featured.length > 1 && (
                  <div className="mt-4 flex items-center gap-2">
                    {featured.map((p, i) => (
                      <button
                        key={p._id}
                        onClick={() => setSlide(i)}
                        aria-label={`Show ${p.name}`}
                        aria-current={i === slide}
                        className="group/dot py-2 focus:outline-none"
                      >
                        <span
                          className={`block h-[2px] w-10 transition-colors ${
                            i === slide
                              ? "bg-cobalt"
                              : "bg-rule group-hover/dot:bg-ink/40 group-focus-visible/dot:bg-cobalt"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-[12px] tabular-nums text-ink/35">
                      {slide + 1} / {featured.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ the shelf */}
      <section id="shelf" className="border-t border-rule">
        <div className="mx-auto max-w-[88rem] px-6 lg:px-10">
          <div className="flex flex-col gap-5 border-b border-rule py-5 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the shelf"
                aria-label="Search products"
                className="w-56 border-b border-rule bg-transparent pb-1.5 text-[15px] placeholder:text-ink/35 focus:border-cobalt focus:outline-none"
              />
              <button
                type="submit"
                className="pb-1.5 text-[14px] text-ink/60 transition-colors hover:text-cobalt"
              >
                Search
              </button>
            </form>

            {shelves.length > 0 && (
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {shelves.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategory(cat)}
                    className={`text-[14px] underline-offset-[6px] transition-colors ${
                      activeCategory === cat
                        ? "text-cobalt underline decoration-cobalt"
                        : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </nav>
            )}

            <div className="flex items-center gap-5">
              {vendors.length > 1 && (
                <select
                  value={activeVendor}
                  onChange={(e) => {
                    setActiveVendor(e.target.value);
                    loadProducts({ vendor: e.target.value });
                  }}
                  aria-label="Filter by maker"
                  className="border-b border-rule bg-transparent pb-1.5 text-[14px] text-ink/70 focus:border-cobalt focus:outline-none"
                >
                  <option value="">All makers</option>
                  {vendors.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              )}

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort products"
                className="border-b border-rule bg-transparent pb-1.5 text-[14px] text-ink/70 focus:border-cobalt focus:outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="pb-1.5 text-[14px] text-cobalt hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="py-12 lg:py-16">
            {loading ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[4/5] animate-pulse rounded-[2px] bg-porcelain" />
                    <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-porcelain" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-display text-2xl">Nothing on this shelf yet</p>
                <p className="mt-2 text-[15px] text-ink/55">
                  Try a different maker, or clear the filters to see the whole catalogue.
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-6 rounded-[2px] border border-ink/20 px-6 py-3 text-[14px] transition-colors hover:border-cobalt hover:text-cobalt"
                  >
                    Show everything
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-4">
                  {products.map((product, i) => (
                    <ProductCard key={product._id} product={product} index={i} />
                  ))}
                </div>
                <p className="mt-14 border-t border-rule pt-5 text-[13px] text-ink/40">
                  {products.length} {products.length === 1 ? "piece" : "pieces"} in stock
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}