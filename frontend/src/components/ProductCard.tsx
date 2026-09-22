"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { Product } from "@/types";

const ProductCard = ({ product, index }: { product: Product; index: number }) => {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const cover = product.media.find((m) => m.type === "image") || product.media[0];

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, delay: Math.min(index * 0.04, 0.4), ease: "power2.out" }
    );
  }, [index]);

  const handleEnter = () => {
    gsap.to(cardRef.current, { y: -4, duration: 0.25, ease: "power2.out" });
  };
  const handleLeave = () => {
    gsap.to(cardRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
  };

  return (
    <Link
      href={`/product/${product._id}`}
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group block overflow-hidden rounded-xl border border-teal-700/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-teal-50">
        {cover ? (
          cover.type === "video" ? (
            <video src={cover.url} className="h-full w-full object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-teal-900/30">No image</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-amber-600">{product.category}</p>
        <h3 className="mt-1 truncate font-semibold text-teal-950">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-teal-950">₹{product.price}</span>
          <span className={`text-xs font-medium ${product.stock > 0 ? "text-teal-700" : "text-red-500"}`}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
