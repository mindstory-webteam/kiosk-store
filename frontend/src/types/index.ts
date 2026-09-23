export interface ProductMedia {
  url: string;
  /** Empty for images imported from a spreadsheet — they live on an external CDN. */
  publicId?: string;
  type: "image" | "video";
  position?: number;
  alt?: string;
  source?: "cloudinary" | "external";
}

export interface ProductSize {
  label: string;
  stock: number;
  sku?: string;
  barcode?: string;
  /** Falls back to the product price when unset. */
  price?: number;
  compareAtPrice?: number;
  grams?: number;
  imageUrl?: string;
}

export interface ProductSeo {
  title?: string;
  description?: string;
}

export interface ProductWeight {
  value?: number;
  unit?: "g" | "kg" | "lb" | "oz";
}

export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  _id: string;

  /* identity */
  handle?: string;
  name: string;
  subName?: string;
  /** HTML. Render with sanitizeHtml(), not as plain text. */
  description: string;

  /* pricing */
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;

  /* classification */
  category: string;
  categoryPath?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];

  /* inventory */
  sku?: string;
  barcode?: string;
  stock: number;
  inventoryPolicy?: "deny" | "continue";
  weight?: ProductWeight;
  requiresShipping?: boolean;
  taxable?: boolean;

  /* options */
  optionName?: string;
  sizes: ProductSize[];

  /* media */
  media: ProductMedia[];

  /* storefront */
  seo?: ProductSeo;
  /** Reference handles from the source catalogue, not question text. */
  faqs?: string[];
  metafields?: Record<string, string>;

  /* state */
  status?: ProductStatus;
  published?: boolean;
  isActive: boolean;

  store?: { _id: string; name: string; location?: string; logo?: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  token: string;
}