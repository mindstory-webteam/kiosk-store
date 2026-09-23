"use client";

import React from "react";
import Link from "next/link";
import type { Product } from "@/types";
import {
  discountPercent,
  formatPrice,
  orderedMedia,
  priceRange,
  productHref,
} from "@/lib/product";

const LOW_STOCK_AT = 3;

const ProductCard = ({ product, index }: { product: Product; index: number }) => {
  const media = orderedMedia(product);
  const images = media.filter((m) => m.type === "image");
  const cover = images[0] ?? media[0];
  // Every piece was photographed from several angles. Hovering turns it round.
  const alternate = images[1];

  const range = priceRange(product);
  const discount = discountPercent(product);
  const soldOut = product.stock <= 0;
  const low = !soldOut && product.stock <= LOW_STOCK_AT;

  return (
    <Link
      href={productHref(product)}
      className="group block focus:outline-none"
      aria-label={product.name}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-porcelain ring-1 ring-ink/5 group-focus-visible:ring-2 group-focus-visible:ring-cobalt">
        {cover ? (
          <>
            {cover.type === "video" ? (
              <video src={cover.url} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.url}
                alt={cover.alt || product.name}
                loading={index < 4 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
            )}

            {alternate && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={alternate.url}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-ink/25">
            No photograph
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-ink/85 py-2 text-center text-xs tracking-wide text-porcelain">
            Sold out
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-4 pt-3.5">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[17px] leading-snug text-ink">
            {product.name}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-ink/45">
            {product.vendor || product.productType || product.category}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-[17px] tabular-nums text-ink">
            {range.varies ? `From ${formatPrice(range.min)}` : formatPrice(product.price)}
          </p>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className="text-[12px] tabular-nums text-ink/35 line-through">
              {formatPrice(product.compareAtPrice)}
            </p>
          )}
        </div>
      </div>

      {(low || discount !== null) && (
        <p className="mt-1.5 text-[12px] text-cobalt">
          {low ? `Only ${product.stock} left` : `${discount}% off`}
        </p>
      )}
    </Link>
  );
};

export default ProductCard;