"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import Lightbox from "@/components/Lightbox";
import type { Product } from "@/types";
import {
  discountPercent,
  formatPrice,
  formatWeight,
  isHtml,
  orderedMedia,
  priceFor,
  sanitizeHtml,
  stockFor,
} from "@/lib/product";

const LOW_STOCK_AT = 3;

export default function ProductDetailsPage() {
  // The route param is a handle now, and still accepts a raw id — the backend
  // resolves either.
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        setProduct(data);
        setActiveMedia(0);
        // Preselect the first variant that is actually in stock.
        const first = (data.sizes ?? []).find((s: Product["sizes"][number]) => s.stock > 0);
        setSelectedSize(first?.label ?? "");
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // A single settle on arrival, not a per-element stagger.
  useEffect(() => {
    if (!product || !stageRef.current) return;
    const context = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-settle]", {
        opacity: 0,
        y: 14,
        duration: 0.7,
        stagger: 0.09,
        ease: "power3.out",
      });
    }, stageRef);
    return () => context.revert();
  }, [product?._id]);

  // Live stock / price updates while a customer is viewing the details page
  useEffect(() => {
    if (!product) return;
    const socket = getSocket();
    const mine = (targetId: string) => targetId === product._id;

    const handleStock = (payload: { _id: string; stock: number; sizes: Product["sizes"] }) => {
      if (!mine(payload._id)) return;
      setProduct((prev) => (prev ? { ...prev, stock: payload.stock, sizes: payload.sizes } : prev));
    };
    const handleUpdated = (updated: Product) => {
      if (mine(updated._id)) setProduct(updated);
    };
    const handleDeleted = (payload: { _id: string }) => {
      if (mine(payload._id)) router.push("/");
    };
    // A bulk import can rewrite this product without emitting a targeted event.
    const handleImported = () => {
      api.get(`/products/${id}`).then(({ data }) => setProduct(data)).catch(() => undefined);
    };

    socket.on("product:stockUpdated", handleStock);
    socket.on("product:updated", handleUpdated);
    socket.on("product:deleted", handleDeleted);
    socket.on("products:imported", handleImported);
    return () => {
      socket.off("product:stockUpdated", handleStock);
      socket.off("product:updated", handleUpdated);
      socket.off("product:deleted", handleDeleted);
      socket.off("products:imported", handleImported);
    };
  }, [product, id, router]);

  const media = useMemo(() => orderedMedia(product ?? undefined), [product]);
  const descriptionHtml = useMemo(
    () => (product && isHtml(product.description) ? sanitizeHtml(product.description) : ""),
    [product]
  );

  const openLightbox = useCallback((index: number) => {
    setActiveMedia(index);
    setLightboxOpen(true);
  }, []);

  /* ---------------- states ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-kaolin">
        <div className="mx-auto max-w-[88rem] px-6 py-14 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="aspect-[4/5] animate-pulse rounded-[3px] bg-porcelain" />
            </div>
            <div className="space-y-4 lg:col-span-5">
              <div className="h-8 w-3/4 animate-pulse rounded bg-porcelain" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-porcelain" />
              <div className="h-24 w-full animate-pulse rounded bg-porcelain" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-kaolin px-6 text-center">
        <p className="font-display text-3xl text-ink">This piece is no longer listed</p>
        <p className="mt-3 max-w-[46ch] text-[15px] text-ink/55">
          It may have sold out or been taken off the shelf.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-[2px] bg-[#171E1B] px-7 py-3.5 text-[14px] font-medium text-[#F6F4F0] transition-colors hover:bg-[#22407A]"
        >
          Back to the shop
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-kaolin px-6 text-center">
        <p className="font-display text-3xl text-ink">Sign in to see the full details</p>
        <p className="mt-3 max-w-[46ch] text-[15px] text-ink/55">
          Measurements, materials and live stock are kept for account holders.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-8 rounded-[2px] bg-[#171E1B] px-7 py-3.5 text-[14px] font-medium text-[#F6F4F0] transition-colors hover:bg-[#22407A]"
        >
          Sign in
        </button>
      </div>
    );
  }

  /* ---------------- derived ---------------- */

  const currentMedia = media[activeMedia];
  const shownStock = stockFor(product, selectedSize);
  const shownPrice = priceFor(product, selectedSize);
  const discount = discountPercent(product);
  const optionLabel =
    product.optionName && product.optionName !== "Title" ? product.optionName : "Options";
  const weight = formatWeight(product.weight);
  const low = shownStock > 0 && shownStock <= LOW_STOCK_AT;

  const specs: Array<[string, string]> = [];
  if (product.sku) specs.push(["Item code", product.sku]);
  if (product.vendor) specs.push(["Maker", product.vendor]);
  if (product.productType) specs.push(["Type", product.productType]);
  if (weight) specs.push(["Weight", weight]);
  if (product.barcode) specs.push(["Barcode", product.barcode]);
  if (product.tags?.length) specs.push(["Tags", product.tags.join(", ")]);
  if (product.store) {
    specs.push([
      "Sold by",
      product.store.location
        ? `${product.store.name}, ${product.store.location}`
        : product.store.name,
    ]);
  }

  return (
    <div className="min-h-screen bg-kaolin text-ink">
      <div ref={stageRef} className="mx-auto max-w-[88rem] px-6 py-8 lg:px-10 lg:py-12">
        <Link
          href="/"
          data-settle
          className="inline-block text-[14px] text-ink/50 underline-offset-[6px] transition-colors hover:text-cobalt hover:underline"
        >
          Back to the shop
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ------------------------------ gallery */}
          <div data-settle className="lg:col-span-7">
            <button
              type="button"
              onClick={() => openLightbox(activeMedia)}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[3px] bg-porcelain ring-1 ring-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
              aria-label="Open photograph full screen"
            >
              <div className="aspect-[4/5] sm:aspect-[5/4]">
                {currentMedia ? (
                  currentMedia.type === "video" ? (
                    <video src={currentMedia.url} className="h-full w-full object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMedia.url}
                      alt={currentMedia.alt || product.name}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-ink/25">
                    No photograph
                  </div>
                )}
              </div>

              <span className="pointer-events-none absolute bottom-4 right-4 rounded-[2px] bg-[#171E1B]/75 px-3 py-1.5 text-[12px] text-[#F6F4F0] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                View full screen
              </span>
            </button>

            {media.length > 1 && (
              <div className="mt-3 grid grid-cols-6 gap-3 sm:grid-cols-8">
                {media.map((m, idx) => (
                  <button
                    key={`${m.url}-${idx}`}
                    onClick={() => setActiveMedia(idx)}
                    onDoubleClick={() => openLightbox(idx)}
                    aria-label={`Photograph ${idx + 1}`}
                    aria-current={idx === activeMedia}
                    className={`aspect-square overflow-hidden rounded-[2px] bg-porcelain transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${
                      idx === activeMedia
                        ? "opacity-100 ring-1 ring-ink/40"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {m.type === "video" ? (
                      <video src={m.url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt={m.alt || ""}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ------------------------------ details */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-10">
              <div data-settle>
                <h1 className="font-display text-[2.1rem] leading-[1.12] tracking-[-0.01em] sm:text-[2.5rem]">
                  {product.name}
                </h1>
                {product.subName && (
                  <p className="mt-2 text-[15px] text-ink/55">{product.subName}</p>
                )}

                <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-rule pb-6">
                  <p className="font-display text-[1.9rem] tabular-nums">
                    {formatPrice(shownPrice)}
                  </p>
                  {product.compareAtPrice && product.compareAtPrice > shownPrice && (
                    <>
                      <span className="text-[16px] tabular-nums text-ink/35 line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                      {discount !== null && (
                        <span className="text-[13px] text-cobalt">{discount}% off</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* variants */}
              {product.sizes.length > 0 && (
                <div data-settle className="mt-7">
                  <p className="text-[13px] text-ink/50">{optionLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.sizes.map((s) => {
                      const active = selectedSize === s.label;
                      const gone = s.stock === 0;
                      return (
                        <button
                          key={s.label}
                          disabled={gone}
                          onClick={() => setSelectedSize(s.label)}
                          className={`rounded-[2px] border px-4 py-2.5 text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${
                            active
                              ? "border-ink bg-[#171E1B] text-[#F6F4F0]"
                              : "border-ink/20 text-ink hover:border-ink"
                          } ${gone ? "cursor-not-allowed border-rule text-ink/25 line-through hover:border-rule" : ""}`}
                        >
                          {s.label}
                          {typeof s.price === "number" && s.price !== product.price && (
                            <span className="ml-2 text-[13px] opacity-70 tabular-nums">
                              {formatPrice(s.price)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* availability */}
              <div data-settle className="mt-7 flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    shownStock > 0 ? "bg-celadon" : "bg-ink/25"
                  }`}
                />
                <p className="text-[14px]">
                  {shownStock > 0 ? (
                    low ? (
                      <span className="text-cobalt">Only {shownStock} left on the shelf</span>
                    ) : (
                      <span className="text-ink/65">In stock, {shownStock} available</span>
                    )
                  ) : (
                    <span className="text-ink/45">Out of stock</span>
                  )}
                </p>
              </div>

              {/* description */}
              {descriptionHtml ? (
                <div
                  data-settle
                  className="product-description mt-8 text-[15px] leading-[1.75] text-ink/75"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p
                  data-settle
                  className="mt-8 max-w-[62ch] whitespace-pre-line text-[15px] leading-[1.75] text-ink/75"
                >
                  {product.description}
                </p>
              )}

              {/* specs */}
              {specs.length > 0 && (
                <dl data-settle className="mt-10 border-t border-rule text-[14px]">
                  {specs.map(([term, value]) => (
                    <div key={term} className="flex gap-6 border-b border-rule py-3">
                      <dt className="w-32 shrink-0 text-ink/45">{term}</dt>
                      <dd className="text-ink/80">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && media.length > 0 && (
        <Lightbox
          media={media}
          index={activeMedia}
          title={product.name}
          onIndexChange={setActiveMedia}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}