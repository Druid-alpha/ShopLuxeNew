import mongoose from "mongoose";
import Brand from "@/lib/db/models/Brand";
import Category from "@/lib/db/models/Category";
import Color from "@/lib/db/models/Color";

export const CLOTHING_TYPES = ["clothes", "shoes", "bags", "bag", "eyeglass"] as const;
export const CLOTHES_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as readonly string[];
export const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"] as readonly string[];
export const BAG_SIZES = ["Small", "Medium", "Large"] as readonly string[];
export const EYEGLASS_SIZES = ["One Size"] as readonly string[];

const FEATURED_CACHE_TTL_MS = 60 * 1000;
const LIST_CACHE_TTL_MS = 30 * 1000;

type CacheEntry<T> = { data: T; updatedAt: number };
const listCache = new Map<string, CacheEntry<any>>();
let featuredCache: CacheEntry<any[]> = { data: [], updatedAt: 0 };

export const getListCache = (key: string) => {
  const entry = listCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > LIST_CACHE_TTL_MS) {
    listCache.delete(key);
    return null;
  }
  return entry.data;
};

export const setListCache = (key: string, data: any) => {
  listCache.set(key, { data, updatedAt: Date.now() });
};

export const invalidateListCache = () => {
  listCache.clear();
};

export const getFeaturedCache = () => {
  if (!featuredCache.data.length) return null;
  if (Date.now() - featuredCache.updatedAt > FEATURED_CACHE_TTL_MS) return null;
  return featuredCache.data;
};

export const getFeaturedCacheUnsafe = () => featuredCache.data;

export const setFeaturedCache = (data: any[]) => {
  featuredCache = { data, updatedAt: Date.now() };
};

export const invalidateFeaturedCache = () => {
  featuredCache = { data: [], updatedAt: 0 };
};

export const isValidObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);
export const toObjectId = (value: string) => new mongoose.Types.ObjectId(value);

export const parseObjectIdList = (value?: string | string[] | null) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(isValidObjectId)
    .map(toObjectId);
};

export const canonicalClothingType = (value?: string | null) => {
  if (!value) return null;
  const v = String(value).toLowerCase();
  return v === "bag" ? "bags" : v;
};

export const isClothingType = (value?: string | null): value is (typeof CLOTHING_TYPES)[number] => {
  if (!value) return false;
  return (CLOTHING_TYPES as readonly string[]).includes(value);
};

export const clothingTypeFilter = (value?: string | null) => {
  if (!value) return null;
  return value === "bags" ? { $in: ["bags", "bag"] } : value;
};

export const getSizeOptionsByClothingType = (isClothingCategory: boolean) => {
  if (!isClothingCategory) {
    return {
      clothes: [],
      shoes: [],
      bags: [],
      eyeglass: [],
    };
  }

  return {
    clothes: CLOTHES_SIZES,
    shoes: SHOE_SIZES,
    bags: BAG_SIZES,
    eyeglass: EYEGLASS_SIZES,
  };
};

export const getSizeOptionsForSelection = (isClothingCategory: boolean, clothingType?: string | null) => {
  if (!isClothingCategory) return [];
  if (!clothingType) return CLOTHES_SIZES;
  if (clothingType === "shoes") return SHOE_SIZES;
  if (clothingType === "clothes") return CLOTHES_SIZES;
  if (clothingType === "bags" || clothingType === "bag") return BAG_SIZES;
  if (clothingType === "eyeglass") return EYEGLASS_SIZES;
  return [];
};

export const sanitizeSizes = (sizes?: string[]) => {
  if (!Array.isArray(sizes)) return [];
  return [...new Set(sizes.map((s) => String(s || "").trim()).filter(Boolean))];
};

export const validateSizesByType = (clothingType?: string | null, sizes?: string[]) => {
  const normalizedType = canonicalClothingType(clothingType);
  if (!normalizedType || !sizes?.length) return true;
  const allowed = getSizeOptionsForSelection(true, normalizedType);
  if (!allowed.length) return true;
  return sizes.every((s) => allowed.includes(String(s)));
};

export const normalizeHex = (hex?: string) => {
  if (!hex) return "";
  let h = String(hex).trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h;
};

const familyFromName = (name?: string) => {
  const n = String(name || "").toLowerCase();
  if (!n) return "";
  if (n.includes("black") || n.includes("onyx") || n.includes("midnight")) return "black";
  if (n.includes("white") || n.includes("ivory") || n.includes("snow") || n.includes("cream")) return "white";
  if (n.includes("gray") || n.includes("grey") || n.includes("silver") || n.includes("slate") || n.includes("graphite"))
    return "gray";
  if (n.includes("red") || n.includes("crimson") || n.includes("ruby") || n.includes("burgundy") || n.includes("maroon"))
    return "red";
  if (n.includes("orange") || n.includes("tangerine") || n.includes("amber") || n.includes("coral")) return "orange";
  if (n.includes("yellow") || n.includes("gold") || n.includes("lemon")) return "yellow";
  if (n.includes("green") || n.includes("emerald") || n.includes("mint") || n.includes("jade")) return "green";
  if (n.includes("blue") || n.includes("navy") || n.includes("azure") || n.includes("sapphire")) return "blue";
  if (n.includes("purple") || n.includes("violet") || n.includes("indigo") || n.includes("plum")) return "purple";
  if (n.includes("pink") || n.includes("rose") || n.includes("fuchsia")) return "pink";
  if (n.includes("brown") || n.includes("tan") || n.includes("beige") || n.includes("camel")) return "brown";
  if (n.includes("teal") || n.includes("cyan") || n.includes("aqua") || n.includes("turquoise")) return "teal";
  return "";
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
};

const familyFromHex = (hex?: string) => {
  const h = normalizeHex(hex);
  if (!h) return "";
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const { h: hue, s, l } = rgbToHsl(r, g, b);

  if (l <= 0.08) return "black";
  if (l >= 0.95) return "white";
  if (s < 0.12) {
    if (l <= 0.2) return "black";
    if (l >= 0.9) return "white";
    if (hue >= 30 && hue < 70) return l >= 0.5 ? "beige" : "brown";
    if (hue >= 70 && hue < 160) return "olive";
    if (hue >= 160 && hue < 250) return "blue gray";
    return "gray";
  }
  if (hue >= 45 && hue < 70 && l < 0.4) return "olive";
  if ((hue >= 330 || hue < 15) && l >= 0.6) return "pink";
  if (hue >= 330 || hue < 15) return "red";
  if (hue < 45) return "orange";
  if (hue < 70) return "yellow";
  if (hue < 165) return "green";
  if (hue < 200) return "teal";
  if (hue < 255) return "blue";
  if (hue < 290) return "purple";
  if (hue < 330) return "pink";
  return "";
};

const inferFamily = (color: { name?: string; hex?: string }) => {
  if (!color) return "";
  const fromName = familyFromName(color.name);
  if (fromName) return fromName;
  return familyFromHex(color.hex);
};

export const expandColorIdsByFamily = async (colorIds: mongoose.Types.ObjectId[]) => {
  if (!colorIds.length) return colorIds;
  const colors = await Color.find({ _id: { $in: colorIds } }).select("_id family name hex");
  if (!colors.length) return colorIds;

  const families = new Set<string>();
  const updates: any[] = [];

  colors.forEach((c) => {
    const family = c.family || inferFamily(c);
    if (family) families.add(family);
    if (!c.family && family) {
      updates.push({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { family } },
        },
      });
    }
  });

  if (updates.length) {
    await Color.bulkWrite(updates, { ordered: false });
  }

  if (families.size === 0) return colorIds;
  const familyColors = await Color.find({ family: { $in: Array.from(families) } }).select("_id");
  const expanded = new Set(colorIds.map(String));
  familyColors.forEach((c) => expanded.add(String(c._id)));
  return Array.from(expanded).map((id) => new mongoose.Types.ObjectId(id));
};

export const resolveCategory = async (categoryParam?: string | null) => {
  if (!categoryParam || categoryParam === "all") return null;

  if (isValidObjectId(categoryParam)) {
    return Category.findById(categoryParam).select("_id name");
  }

  return Category.findOne({
    name: new RegExp(`^${categoryParam}$`, "i"),
  }).select("_id name");
};

const readQuery = (searchParams: URLSearchParams, key: string) => {
  const all = searchParams.getAll(key).filter(Boolean);
  if (all.length === 0) return "";
  if (all.length === 1) return all[0];
  return all.join(",");
};

export const buildQueryFromSearchParams = async (
  searchParams: URLSearchParams,
  { admin = false }: { admin?: boolean } = {}
) => {
  const q: Record<string, any> = {};
  if (!admin) q.isDeleted = false;
  const andConditions: any[] = [];

  const search = readQuery(searchParams, "search");
  if (search) {
    const regex = new RegExp(search, "i");
    const [matchedCategories, matchedBrands] = await Promise.all([
      Category.find({ name: regex }).select("_id"),
      Brand.find({ name: regex }).select("_id"),
    ]);
    const categoryIds = matchedCategories.map((c) => c._id);
    const brandIds = matchedBrands.map((b) => b._id);
    andConditions.push({
      $or: [
        { title: regex },
        { description: regex },
        { sku: regex },
        ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
        ...(brandIds.length ? [{ brand: { $in: brandIds } }] : []),
      ],
    });
  }

  const categoryParam = readQuery(searchParams, "category");
  let category: any = null;
  if (categoryParam && categoryParam !== "all") {
    if (admin && isValidObjectId(categoryParam)) {
      category = { _id: toObjectId(categoryParam), name: null };
    } else {
      category = await resolveCategory(categoryParam);
    }
  }
  if (categoryParam && categoryParam !== "all" && !category) {
    andConditions.push({ _id: { $in: [] } });
  }
  if (category) {
    andConditions.push({ category: category._id });
  }

  const clothingTypeRaw = readQuery(searchParams, "clothingType");
  const clothingType = clothingTypeRaw && clothingTypeRaw !== "all" ? canonicalClothingType(clothingTypeRaw) : null;
  const isClothingCategory = category?.name?.toLowerCase() === "clothing";
  if (clothingType) {
    if (!isClothingType(clothingType)) {
      andConditions.push({ _id: { $in: [] } });
    } else if (!admin && !isClothingCategory) {
      andConditions.push({ _id: { $in: [] } });
    } else {
      andConditions.push({ clothingType: clothingTypeFilter(clothingType) });
    }
  }

  const brandParam = readQuery(searchParams, "brand");
  if (brandParam && brandParam !== "all") {
    const brandIds = parseObjectIdList(brandParam);
    if (brandIds.length > 0) {
      andConditions.push({ brand: { $in: brandIds } });
    } else {
      andConditions.push({ _id: { $in: [] } });
    }
  }

  const colorParam = readQuery(searchParams, "color");
  if (colorParam && colorParam !== "all") {
    const colorIds = parseObjectIdList(colorParam);
    if (colorIds.length > 0) {
      const expandedColorIds = await expandColorIdsByFamily(colorIds);
      andConditions.push({
        $or: [
          { color: { $in: expandedColorIds } },
          { "variants.options.color": { $in: expandedColorIds } },
        ],
      });
    } else {
      andConditions.push({ _id: { $in: [] } });
    }
  }

  const tagsParam = readQuery(searchParams, "tags");
  if (tagsParam) {
    andConditions.push({ tags: { $in: tagsParam.split(",").map((t) => t.trim()) } });
  }

  const minPrice = readQuery(searchParams, "minPrice");
  const maxPrice = readQuery(searchParams, "maxPrice");
  if (minPrice || maxPrice) {
    const priceQuery: any = {};
    if (minPrice) priceQuery.$gte = Number(minPrice);
    if (maxPrice) priceQuery.$lte = Number(maxPrice);

    andConditions.push({
      $or: [
        { variants: { $size: 0 }, price: priceQuery },
        { "variants.price": priceQuery },
      ],
    });
  }

  const availability = readQuery(searchParams, "availability");
  if (availability) {
    const statuses = availability.split(",");
    const availConditions: any[] = [];

    if (statuses.includes("in_stock")) {
      availConditions.push({
        $or: [
          { variants: { $size: 0 }, stock: { $gt: 0 } },
          { "variants.stock": { $gt: 0 } },
        ],
      });
    }

    if (statuses.includes("out_of_stock")) {
      availConditions.push({
        $and: [
          { variants: { $size: 0 }, stock: { $lte: 0 } },
          {
            $or: [
              { variants: { $exists: false } },
              { variants: { $size: 0 } },
              { "variants.stock": { $lte: 0 } },
            ],
          },
        ],
      });
    }

    if (availConditions.length > 0) {
      if (availConditions.length === 1) {
        andConditions.push(availConditions[0]);
      } else {
        andConditions.push({ $or: availConditions });
      }
    }
  }

  const onSaleRaw = readQuery(searchParams, "onSale") || readQuery(searchParams, "sale");
  const onSale = ["1", "true", "yes"].includes(String(onSaleRaw || "").toLowerCase());
  if (onSale) {
    andConditions.push({
      $or: [{ discount: { $gt: 0 } }, { "variants.discount": { $gt: 0 } }],
    });
  }

  if (andConditions.length > 0) q.$and = andConditions;
  return q;
};

export const findDuplicateSkus = (variants: Array<{ sku?: string }> = []) => {
  const counts = new Map<string, number>();
  variants.forEach((v) => {
    const sku = String(v?.sku || "").trim();
    if (!sku) return;
    counts.set(sku, (counts.get(sku) || 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku);
};

export const normalizeVariants = (variants: any[] = []) =>
  variants.map((v) => ({
    sku: v.sku || "",
    options: {
      color: v.options?.color && isValidObjectId(v.options.color) ? toObjectId(v.options.color) : null,
      size: v.options?.size || null,
    },
    price: Number(v.price) || 0,
    discount: Number(v.discount) || 0,
    stock: Number(v.stock) || 0,
    image: v.image?.url && v.image?.public_id ? v.image : null,
  }));
