import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartItem, ProductVariant } from "@/types/models";

type GuestCartItem = CartItem & {
  key: string;
  qty: number;
  addedAt?: string;
  baseProductImage?: string | null;
  productImage?: string | null;
  basePrice?: number;
  discount?: number;
  variant?: string | ProductVariant | null;
  variantPayload?: ProductVariant | null;
  variantSize?: string;
  variantColorName?: string;
  variantColorHex?: string | null;
  variantStock?: number | null;
};

const sortNewestFirst = (items: GuestCartItem[] = []) =>
  [...items].sort(
    (a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
  );

const getVariantKey = (variant: GuestCartItem["variant"]) => {
  if (!variant) return "default"
  if (typeof variant === "string") return variant || "default"
  if ("sku" in variant && variant?.sku) return variant.sku
  const size = (variant as any)?.size || ""
  const color = (variant as any)?.color || ""
  if (size && !color) return size
  if (color && !size) return color
  const combined = `${color}|${size}`.trim()
  return combined === "|" ? "default" : combined
}

const persistGuestCart = (items: GuestCartItem[]) => {
  localStorage.setItem("guestCart", JSON.stringify(items));
}

const loadGuestCart = (): GuestCartItem[] => {
  try {
    const saved = (JSON.parse(localStorage.getItem("guestCart") || "[]") || []) as GuestCartItem[];
    const seedTime = Date.now();
    const normalized = saved.map((item, index) => ({
      ...item,
      baseProductImage: item.baseProductImage || item.productImage || null,
      key: item.key || `${item.productId}-${getVariantKey(item.variant)}`,
      addedAt: item.addedAt || new Date(seedTime + index).toISOString(),
    }));
    return sortNewestFirst(normalized);
  } catch {
    return [];
  }
}

type CartState = {
  items: GuestCartItem[];
};

const initialState: CartState = {
  items: loadGuestCart(),
};

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {

    setCart: (state, action: PayloadAction<GuestCartItem[]>) => {
      state.items = sortNewestFirst(action.payload || []);
    },

    addGuestCart: (state, action: PayloadAction<GuestCartItem>) => {
      const item = action.payload;
      const addedAt = item.addedAt || new Date().toISOString();

      const exists = state.items.find(i =>
        i.productId === item.productId &&
        getVariantKey(i.variant) === getVariantKey(item.variant)
      )

      if (exists) {
        exists.qty += item.qty || 1;
        exists.addedAt = addedAt;
      } else {
        state.items.push({ ...item, addedAt });
      }

      state.items = sortNewestFirst(state.items);
      persistGuestCart(state.items);
    },

    updateGuestCartQty: (state, action: PayloadAction<{ key: string; qty: number }>) => {
      const { key, qty } = action.payload;
      state.items = state.items.map((item) =>
        item.key === key ? { ...item, qty: Math.max(1, Number(qty) || 1) } : item
      )
      persistGuestCart(state.items);
    },

    updateGuestCartVariant: (state, action: PayloadAction<{
      key: string;
      nextVariant: ProductVariant | string | null;
      nextMeta?: {
        size?: string;
        colorName?: string;
        colorHex?: string | null;
        stock?: number | null;
        imageUrl?: string | null;
        finalPrice?: number;
        basePrice?: number;
        discount?: number;
      };
    }>) => {
      const { key, nextVariant, nextMeta } = action.payload;
      const existing = state.items.find((item) => item.key === key);
      if (!existing) return;

      const newKey = `${existing.productId}-${getVariantKey(nextVariant as any)}`;
      const already = state.items.find((item) => item.key === newKey);

      if (already && already.key !== key) {
        already.qty += existing.qty;
        state.items = state.items.filter((item) => item.key !== key);
      } else {
        state.items = state.items.map((item) =>
          item.key === key
            ? {
              ...item,
              key: newKey,
              variant: (nextVariant as any)?.sku || nextVariant || null,
              variantPayload: (nextVariant && typeof nextVariant === "object") ? nextVariant : null,
              variantSize: nextMeta?.size || "",
              variantColorName: nextMeta?.colorName || "",
              variantColorHex: nextMeta?.colorHex || null,
              variantStock: Number.isFinite(nextMeta?.stock ?? NaN) ? Number(nextMeta?.stock) : null,
              productImage: nextMeta?.imageUrl || item.baseProductImage || item.productImage,
              price: Number(nextMeta?.finalPrice ?? item.price),
              basePrice: Number(nextMeta?.basePrice ?? item.basePrice),
              discount: Number(nextMeta?.discount ?? item.discount),
            }
            : item
        )
      }

      state.items = sortNewestFirst(state.items);
      persistGuestCart(state.items);
    },

    removeGuestCartItem: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.items = state.items.filter((item) => item.key !== key);
      persistGuestCart(state.items);
    },

    clearCart: (state) => {
      state.items = [];
      localStorage.removeItem("guestCart");
    }
  }
})

export const {
  setCart,
  addGuestCart,
  updateGuestCartQty,
  updateGuestCartVariant,
  removeGuestCartItem,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;


