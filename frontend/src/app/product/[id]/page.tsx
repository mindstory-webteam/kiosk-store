"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/types";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then(({ data }) => setProduct(data))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (product && contentRef.current) {
      gsap.fromTo(
        contentRef.current.children,
        { opacity: 0, x: 16 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }
      );
    }
  }, [product]);

  // Live stock / price updates while a customer is viewing the details page
  useEffect(() => {
    const socket = getSocket();
    const handleStock = (payload: { _id: string; stock: number; sizes: Product["sizes"] }) => {
      if (payload._id === id) {
        setProduct((prev) => (prev ? { ...prev, stock: payload.stock, sizes: payload.sizes } : prev));
      }
    };
    const handleUpdated = (updated: Product) => {
      if (updated._id === id) setProduct(updated);
    };
    const handleDeleted = (payload: { _id: string }) => {
      if (payload._id === id) router.push("/");
    };

    socket.on("product:stockUpdated", handleStock);
    socket.on("product:updated", handleUpdated);
    socket.on("product:deleted", handleDeleted);
    return () => {
      socket.off("product:stockUpdated", handleStock);
      socket.off("product:updated", handleUpdated);
      socket.off("product:deleted", handleDeleted);
    };
  }, [id, router]);

  if (loading) return <p className="mx-auto max-w-6xl px-6 py-16 text-teal-900/50">Loading...</p>;
  if (!product) return <p className="mx-auto max-w-6xl px-6 py-16 text-teal-900/50">Product not found.</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h2 className="mb-2 text-xl font-bold text-teal-950">Login required</h2>
        <p className="mb-6 text-sm text-teal-900/60">Please sign in to view full product details.</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-md bg-teal-950 px-6 py-2.5 font-semibold text-cloud hover:bg-teal-800"
        >
          Go to login
        </button>
      </div>
    );
  }

  const media = product.media.length ? product.media : [];
  const currentMedia = media[activeMedia];
  const sizeStock = selectedSize
    ? product.sizes.find((s) => s.label === selectedSize)?.stock ?? 0
    : product.stock;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div ref={contentRef} className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-teal-700/10 bg-white">
            {currentMedia ? (
              currentMedia.type === "video" ? (
                <video src={currentMedia.url} className="h-full w-full object-cover" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentMedia.url} alt={product.name} className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-teal-900/30">No media</div>
            )}
          </div>
          {media.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto">
              {media.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMedia(idx)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                    idx === activeMedia ? "border-amber-500" : "border-transparent"
                  }`}
                >
                  {m.type === "video" ? (
                    <video src={m.url} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-amber-600">{product.category}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-teal-950">{product.name}</h1>
          {product.store && (
            <p className="mt-1 text-sm text-teal-900/50">
              Sold by {product.store.name}
              {product.store.location ? ` · ${product.store.location}` : ""}
            </p>
          )}

          <p className="mt-4 text-3xl font-bold text-teal-950">₹{product.price}</p>

          <p className="mt-6 leading-relaxed text-teal-900/80">{product.description}</p>

          {product.sizes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-teal-950">Available sizes</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s.label}
                    disabled={s.stock === 0}
                    onClick={() => setSelectedSize(s.label)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      selectedSize === s.label
                        ? "border-teal-950 bg-teal-950 text-cloud"
                        : "border-teal-700/30 text-teal-900"
                    } ${s.stock === 0 ? "cursor-not-allowed opacity-30" : "hover:border-teal-950"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                sizeStock > 0 ? "bg-teal-100 text-teal-800" : "bg-red-100 text-red-600"
              }`}
            >
              {sizeStock > 0 ? `${sizeStock} in stock` : "Out of stock"}
            </span>
            <span className="text-xs text-teal-900/40">Updates live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
