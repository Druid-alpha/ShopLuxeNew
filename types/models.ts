export type ImageRef = {
  url: string;
  public_id?: string;
  _id?: string;
};

export type ColorRef =
  | {
      _id?: string;
      name?: string;
      hex?: string;
    }
  | string
  | null
  | undefined;

export type ProductVariant = {
  _id?: string;
  sku?: string;
  options?: {
    color?: ColorRef;
    size?: string;
  };
  price?: number;
  discount?: number;
  stock?: number;
  reserved?: number;
  image?: ImageRef | null;
};

export type CategoryRef =
  | {
      _id?: string;
      name?: string;
    }
  | string
  | null
  | undefined;

export type Product = {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  discount?: number;
  images?: ImageRef[];
  variants?: ProductVariant[];
  avgRating?: number;
  reviewsCount?: number;
  stock?: number;
  reserved?: number;
  totalStock?: number;
  totalReserved?: number;
  category?: CategoryRef;
  color?: ColorRef;
  clothingType?: string | null;
  sizes?: string[];
  tags?: string[];
  [key: string]: unknown;
};

export type User = {
  _id?: string;
  name?: string;
  email?: string;
  role?: "user" | "admin" | string;
  emailVerified?: boolean;
  [key: string]: unknown;
};

export type Review = {
  _id?: string;
  user?: User;
  rating?: number;
  comment?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type CartItem = {
  productId: string;
  title?: string;
  price?: number;
  qty?: number;
  variant?: ProductVariant | null;
  [key: string]: unknown;
};

export type Order = {
  _id?: string;
  items?: CartItem[];
  total?: number;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
};
