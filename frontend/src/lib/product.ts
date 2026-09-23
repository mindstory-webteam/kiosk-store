import DOMPurify from "isomorphic-dompurify";
import type { Product, ProductMedia } from "@/types";

/**
 * Product descriptions arrive as HTML from the catalogue import, so they must
 * be sanitized before they go anywhere near dangerouslySetInnerHTML.
 *
 * `isomorphic-dompurify` works in both the server and browser passes, which a
 * plain `dompurify` import does not.
 */
export const sanitizeHtml = (html?: string): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "span", "small",
      "ul", "ol", "li", "h2", "h3", "h4", "a", "blockquote", "table",
      "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
    // Keep imported class names out of the markup — they belong to the source
    // storefront's CSS ("isSelectedEnd" and friends) and mean nothing here.
    FORBID_ATTR: ["class", "style", "id"],
  });
};

/** Does the description contain markup, or is it legacy plain text? */
export const isHtml = (value?: string): boolean => !!value && /<[a-z][\s\S]*>/i.test(value);

/** Media ordered by the `position` the catalogue assigned. */
export const orderedMedia = (product?: Pick<Product, "media">): ProductMedia[] =>
  [...(product?.media ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

/** The image a card should lead with. */
export const coverMedia = (product?: Pick<Product, "media">): ProductMedia | undefined => {
  const media = orderedMedia(product);
  return media.find((m) => m.type === "image") ?? media[0];
};

/** Price for the selected variant, falling back to the product price. */
export const priceFor = (product: Product, sizeLabel?: string): number => {
  if (!sizeLabel) return product.price;
  const size = product.sizes?.find((s) => s.label === sizeLabel);
  return size?.price ?? product.price;
};

/** Stock for the selected variant, or the overall balance. */
export const stockFor = (product: Product, sizeLabel?: string): number => {
  if (!sizeLabel) return product.stock;
  return product.sizes?.find((s) => s.label === sizeLabel)?.stock ?? 0;
};

/** Lowest price across variants — for "from ₹x" on cards. */
export const priceRange = (product: Product): { min: number; max: number; varies: boolean } => {
  const prices = (product.sizes ?? [])
    .map((s) => s.price)
    .filter((p): p is number => typeof p === "number");
  if (!prices.length) return { min: product.price, max: product.price, varies: false };
  const min = Math.min(...prices, product.price);
  const max = Math.max(...prices, product.price);
  return { min, max, varies: min !== max };
};

export const formatPrice = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

export const discountPercent = (product: Product): number | null => {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return null;
  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
};

/** The canonical URL for a product — prefers the handle, falls back to the id. */
export const productHref = (product: Pick<Product, "_id" | "handle">): string =>
  `/product/${product.handle || product._id}`;

export const formatWeight = (weight?: Product["weight"]): string | null => {
  if (!weight?.value) return null;
  return `${weight.value} ${weight.unit ?? "g"}`;
};