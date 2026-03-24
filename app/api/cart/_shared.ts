import mongoose from "mongoose";
import Color from "@/lib/db/models/Color";

export const isValidObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);

const colorKey = (value: any) => {
  if (!value) return "";
  if (typeof value === "object") {
    return String(value._id || value.name || value.hex || "");
  }
  return String(value);
};

export const normalizeVariant = (variant: any) => {
  if (!variant) return { _id: "", sku: "", size: "", color: "", empty: true };
  if (typeof variant === "string") {
    const sku = String(variant || "");
    return { _id: "", sku, size: "", color: "", empty: !sku };
  }
  if (typeof variant === "object") {
    const rawId = variant._id || variant.id || "";
    const _id = rawId ? String(rawId) : "";
    const sku = String(variant.sku || "");
    const size = String(variant.size || "");
    const color = colorKey(variant.color);
    const empty = !(_id || sku || size || color);
    return { _id, sku, size, color, empty };
  }
  return { _id: "", sku: "", size: "", color: "", empty: true };
};

export const resolveColorId = async (raw: any) => {
  if (!raw) return "";
  if (typeof raw === "object") {
    if (raw._id && isValidObjectId(raw._id)) return String(raw._id);
    if (raw.id && isValidObjectId(raw.id)) return String(raw.id);
    if (raw.name || raw.hex) raw = raw.name || raw.hex;
  }
  const str = String(raw || "").trim();
  if (!str) return "";
  if (isValidObjectId(str)) return str;
  const found = await Color.findOne({
    $or: [{ name: new RegExp(`^${str}$`, "i") }, { hex: new RegExp(`^${str}$`, "i") }],
  })
    .select("_id")
    .lean();
  return found?._id ? String(found._id) : "";
};

export const findVariantsByOptions = async (product: any, size: any, color: any) => {
  if (!product?.variants?.length) return [];
  const sizeKey = String(size || "").trim();
  const colorKeyValue = await resolveColorId(color);
  return product.variants.filter((v: any) => {
    const vSize = String(v?.options?.size || "").trim();
    const vColor = String(v?.options?.color?._id || v?.options?.color || "");
    const sizeMatch = sizeKey ? vSize === sizeKey : true;
    const colorMatch = colorKeyValue ? vColor === colorKeyValue : true;
    return sizeMatch && colorMatch;
  });
};

export const findVariantByOptions = async (product: any, size: any, color: any) => {
  const matches = await findVariantsByOptions(product, size, color);
  if (matches.length === 1) return matches[0];
  return null;
};

export const resolveVariantForInput = async (product: any, variantInput: any = {}) => {
  if (!product?.variants?.length) return null;
  const input = typeof variantInput === "object" ? variantInput : {};
  const sku = typeof variantInput === "string" ? variantInput : input.sku || null;
  const id = typeof variantInput === "object" ? input._id || null : null;
  const size = typeof variantInput === "object" ? input.size || null : null;
  const color = typeof variantInput === "object" ? input.color || null : null;

  if (id) {
    const match = product.variants.find((v: any) => String(v._id) === String(id));
    return match || null;
  }

  if (sku) {
    const matches = product.variants.filter((v: any) => v.sku === String(sku));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1 && (size || color)) {
      const refined = matches.filter((v: any) => {
        const vSize = String(v?.options?.size || "").trim();
        const vColor = String(v?.options?.color?._id || v?.options?.color || "");
        const sizeKey = String(size || "").trim();
        const colorKeyValue = String(color || "");
        const sizeMatch = sizeKey ? vSize === sizeKey : true;
        const colorMatch = colorKeyValue ? vColor === colorKeyValue : true;
        return sizeMatch && colorMatch;
      });
      if (refined.length === 1) return refined[0];
    }
    return null;
  }

  if (size || color) {
    return findVariantByOptions(product, size, color);
  }
  return null;
};

export const attachColorMeta = async (cart: any[] = []) => {
  const ids = new Set<string>();
  cart.forEach((item) => {
    const vColor = item?.variant?.color;
    if (typeof vColor === "string" && isValidObjectId(vColor)) ids.add(vColor);
    const pColor = item?.product?.color;
    if (typeof pColor === "string" && isValidObjectId(pColor)) ids.add(pColor);
    const variants = item?.product?.variants || [];
    variants.forEach((v: any) => {
      const c = v?.options?.color;
      if (typeof c === "string" && isValidObjectId(c)) ids.add(c);
    });
  });

  if (!ids.size) return cart;
  const colors = await Color.find({ _id: { $in: Array.from(ids) } }).select("_id name hex");
  const map = new Map(colors.map((c: any) => [String(c._id), c]));

  cart.forEach((item) => {
    if (item?.variant?.color && typeof item.variant.color === "string") {
      const c = map.get(String(item.variant.color));
      if (c) item.variant.color = c;
    }
    if (item?.product?.color && typeof item.product.color === "string") {
      const c = map.get(String(item.product.color));
      if (c) item.product.color = c;
    }
    const variants = item?.product?.variants || [];
    variants.forEach((v: any) => {
      if (typeof v?.options?.color === "string") {
        const c = map.get(String(v.options.color));
        if (c) v.options.color = c;
      }
    });
  });

  return cart;
};

