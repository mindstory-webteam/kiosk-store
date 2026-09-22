export interface ProductMedia {
  url: string;
  publicId: string;
  type: "image" | "video";
}

export interface ProductSize {
  label: string;
  stock: number;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sizes: ProductSize[];
  media: ProductMedia[];
  store?: { _id: string; name: string; location?: string; logo?: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  token: string;
}
