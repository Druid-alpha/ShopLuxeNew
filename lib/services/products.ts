
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Product from "@/lib/db/models/product";
import Brand from "@/lib/db/models/Brand";
import Category from "@/lib/db/models/Category";
import Color from "@/lib/db/models/Color";
import { uploadToCloudinary } from "@/lib/middleware/upload";
import cloudinary from "@/lib/config/cloudinary";
import { requireAdmin } from "@/app/api/_utils/auth";
import { parseBodyAndFiles } from "@/app/api/_utils/request";
import {
  BAG_SIZES,
  CLOTHES_SIZES,
  EYEGLASS_SIZES,
  SHOE_SIZES,
  buildQueryFromSearchParams,
  canonicalClothingType,
  clothingTypeFilter,
  expandColorIdsByFamily,
  findDuplicateSkus,
  getFeaturedCache,
  getFeaturedCacheUnsafe,
  getListCache,
  getSizeOptionsByClothingType,
  getSizeOptionsForSelection,
  invalidateFeaturedCache,
  invalidateListCache,
  isClothingType,
  isValidObjectId,
  normalizeVariants,
  parseObjectIdList,
  resolveCategory,
  sanitizeSizes,
  setFeaturedCache,
  setListCache,
  toObjectId,
  validateSizesByType,
} from "@/app/api/products/_shared";
import { runOrderReservationCleanupOnce } from "@/lib/jobs/orderReservationCleanupJob";

const objectId = () => z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const variantSchema = z.object({
  _id: objectId().optional(),
  sku: z.string().min(3),
  options: z.object({
    color: objectId().optional(),
    size: z.string().optional(),
  }),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0),
  image: z
    .object({
      url: z.string(),
      public_id: z.string(),
    })
    .optional()
    .nullable(),
});

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  price: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  category: objectId(),
  color: objectId().optional(),
  brand: objectId().optional(),
  tags: z.array(z.string()).optional(),
  stock: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  featured: z.boolean().optional(),
  clothingType: z.enum(["clothes", "shoes", "bags", "eyeglass"]).optional(),
  sizes: z.array(z.string()).optional(),
  variants: z.array(variantSchema).optional(),
  images: z
    .array(
      z.object({
        url: z.string(),
        public_id: z.string(),
        _id: z.string().optional(),
      })
    )
    .optional(),
});

const updateSchema = createSchema.partial().extend({
  brand: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  color: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  category: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
});

const readQuery = (searchParams: URLSearchParams, key: string) => {
  const all = searchParams.getAll(key).filter(Boolean);
  if (all.length === 0) return "";
  if (all.length === 1) return all[0];
  return all.join(",");
};

export async function listProducts(request: NextRequest) {
  await connectDB();

  try {
    try {
      await runOrderReservationCleanupOnce();
      invalidateListCache();
    } catch (cleanupErr: any) {
      console.warn("[PRODUCT LIST] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    const cacheKey = request.url;
    const cached = getListCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Number(searchParams.get("limit") || 12));
    let sortByQuery = "-createdAt";
    const sortBy = searchParams.get("sortBy");
    if (sortBy) {
      switch (sortBy) {
        case "price-asc":
          sortByQuery = "price";
          break;
        case "price-desc":
          sortByQuery = "-price";
          break;
        case "newest":
          sortByQuery = "-createdAt";
          break;
        case "rating":
          sortByQuery = "-avgRating";
          break;
        default:
          sortByQuery = "-createdAt";
      }
    }

    const query = await buildQueryFromSearchParams(searchParams);
    const total = await Product.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (total === 0) {
      const emptyPayload = {
        products: [],
        total: 0,
        page: 1,
        pages: 1,
        message: "No products found for the selected filters",
      };
      setListCache(cacheKey, emptyPayload);
      return NextResponse.json(emptyPayload);
    }

    const products = await Product.find(query)
      .populate("brand category variants.options.color color")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortByQuery);

    const productsWithStock = products.map((prod: any) => {
      const variantStock = prod.variants?.length
        ? prod.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
        : 0;
      const variantReserved = prod.variants?.length
        ? prod.variants.reduce((sum: number, v: any) => sum + (v.reserved || 0), 0)
        : 0;
      const availableVariantStock = prod.variants?.length
        ? prod.variants.reduce(
            (sum: number, v: any) => sum + Math.max(0, (v.stock || 0) - (v.reserved || 0)),
            0
          )
        : 0;

      const totalStock = (prod.stock || 0) + variantStock;
      const totalReserved = (prod.reserved || 0) + variantReserved;
      const availableStock =
        Math.max(0, (prod.stock || 0) - (prod.reserved || 0)) + availableVariantStock;

      return {
        ...prod.toObject(),
        totalStock,
        totalReserved,
        availableStock,
        isOutOfStock: availableStock <= 0,
      };
    });

    const payload = {
      products: productsWithStock,
      total,
      page,
      pages: totalPages,
      message: null,
    };

    setListCache(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to list products" }, { status: 500 });
  }
}
export async function getFeaturedProducts(request: NextRequest) {
  await connectDB();

  try {
    const url = new URL(request.url);
    const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit") || 12)));

    const cached = getFeaturedCache();
    if (cached?.length) {
      return NextResponse.json({ products: cached.slice(0, limit), cached: true });
    }

    let products = await Product.find({ isDeleted: false, featured: true })
      .populate("brand category variants.options.color color")
      .sort({ createdAt: -1 })
      .limit(limit);

    if (!products.length) {
      products = await Product.find({ isDeleted: false })
        .populate("brand category variants.options.color color")
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    if (products.length > 0) {
      setFeaturedCache(products as any);
    }

    return NextResponse.json({ products });
  } catch (err) {
    console.error(err);
    const cached = getFeaturedCacheUnsafe();
    if (cached?.length) {
      return NextResponse.json({ products: cached.slice(0, 12), stale: true });
    }
    return NextResponse.json({ message: "Failed to fetch featured products" }, { status: 500 });
  }
}

export async function getProductFilters(request: NextRequest) {
  await connectDB();

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const categories = await Category.find().select("_id name");

    const category = await resolveCategory(readQuery(searchParams, "category"));
    const includeAllBrands = ["1", "true", "yes"].includes(
      String(readQuery(searchParams, "includeAllBrands") || "").toLowerCase()
    );
    const isClothingCategory = category?.name?.toLowerCase() === "clothing";
    const clothingTypeRaw = readQuery(searchParams, "clothingType");
    const clothingType = clothingTypeRaw && clothingTypeRaw !== "all" ? canonicalClothingType(clothingTypeRaw) : null;

    const selectedBrandIds = parseObjectIdList(readQuery(searchParams, "brand"));
    const selectedColorIds = parseObjectIdList(readQuery(searchParams, "color"));
    const expandedSelectedColorIds = selectedColorIds.length
      ? await expandColorIdsByFamily(selectedColorIds)
      : [];

    const baseFilter: Record<string, any> = { isDeleted: false };
    if (category) baseFilter.category = category._id;
    if (clothingType && isClothingCategory && isClothingType(clothingType)) {
      baseFilter.clothingType = clothingTypeFilter(clothingType);
    }

    if (clothingType && (!isClothingCategory || !isClothingType(clothingType))) {
      return NextResponse.json({
        categories,
        brands: [],
        clothingTypes: [],
        sizeOptions: [],
        sizeOptionsByClothingType: {
          clothes: [],
          shoes: [],
          bags: [],
          eyeglass: [],
        },
        colors: [],
        availability: [
          { label: "In Stock", value: "in_stock" },
          { label: "Out of Stock", value: "out_of_stock" },
        ],
        message: "No products found for the selected filters",
      });
    }

    const brandScope: Record<string, any> = { ...baseFilter };
    if (expandedSelectedColorIds.length) {
      brandScope.$or = [
        { color: { $in: expandedSelectedColorIds } },
        { "variants.options.color": { $in: expandedSelectedColorIds } },
      ];
    }
    const brandIds = await Product.distinct("brand", brandScope);

    const colorScope: Record<string, any> = { ...baseFilter };
    if (selectedBrandIds.length) {
      colorScope.brand = { $in: selectedBrandIds };
    }
    const [colorIdsFromMain, colorIdsFromVariants] = await Promise.all([
      Product.distinct("color", colorScope),
      Product.distinct("variants.options.color", colorScope),
    ]);
    const combinedColorIds = [...new Set([...colorIdsFromMain, ...colorIdsFromVariants])].filter(Boolean);

    const [brands, colors] = await Promise.all([
      includeAllBrands
        ? Brand.find({ ...(category ? { category: category._id } : {}), isActive: true }).select("_id name")
        : Brand.find({ _id: { $in: brandIds }, isActive: true }).select("_id name"),
      Color.find({ _id: { $in: combinedColorIds } }).select("_id name hex"),
    ]);

    const clothingTypes = isClothingCategory ? ["clothes", "shoes", "bags", "eyeglass"] : [];
    const sizeOptionsByClothingType = getSizeOptionsByClothingType(isClothingCategory);
    const sizeOptions = getSizeOptionsForSelection(isClothingCategory, clothingType);
    const availability = [
      { label: "In Stock", value: "in_stock" },
      { label: "Out of Stock", value: "out_of_stock" },
    ];

    const activeProductFilter: Record<string, any> = { ...baseFilter };
    if (selectedBrandIds.length) activeProductFilter.brand = { $in: selectedBrandIds };
    if (expandedSelectedColorIds.length) {
      activeProductFilter.$or = [
        { color: { $in: expandedSelectedColorIds } },
        { "variants.options.color": { $in: expandedSelectedColorIds } },
      ];
    }
    const matchedProducts = await Product.countDocuments(activeProductFilter);

    return NextResponse.json({
      categories,
      brands,
      clothingTypes,
      sizeOptions,
      sizeOptionsByClothingType,
      colors,
      availability,
      message: matchedProducts === 0 ? "No products found for the selected filters" : undefined,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to fetch filter options" }, { status: 500 });
  }
}
export async function getProductsByIds(request: NextRequest) {
  await connectDB();

  try {
    const url = new URL(request.url);
    const idsParam = url.searchParams.getAll("ids");
    const raw = idsParam.length ? idsParam.join(",") : "";
    const ids = raw
      ? raw
          .split(",")
          .map((v) => v.trim())
          .filter(isValidObjectId)
      : [];

    if (!ids.length) return NextResponse.json({ products: [] });

    const products = await Product.find({ _id: { $in: ids }, isDeleted: false })
      .populate("brand category variants.options.color color")
      .lean();

    const productMap = new Map(products.map((p: any) => [String(p._id), p]));
    const ordered = ids.map((id) => productMap.get(id)).filter(Boolean);

    return NextResponse.json({ products: ordered });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to fetch products by ids" }, { status: 500 });
  }
}

export async function getProductById(_request: NextRequest, id: string) {
  await connectDB();

  try {
    try {
      await runOrderReservationCleanupOnce();
    } catch (cleanupErr: any) {
      console.warn("[PRODUCT] Reservation cleanup skipped:", cleanupErr?.message || cleanupErr);
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findOne({ _id: toObjectId(id), isDeleted: false })
      .populate("brand category variants.options.color color");

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const variantStock = product.variants?.length
      ? product.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
      : 0;
    const variantReserved = product.variants?.length
      ? product.variants.reduce((sum: number, v: any) => sum + (v.reserved || 0), 0)
      : 0;
    const availableVariantStock = product.variants?.length
      ? product.variants.reduce(
          (sum: number, v: any) => sum + Math.max(0, (v.stock || 0) - (v.reserved || 0)),
          0
        )
      : 0;

    const totalStock = (product.stock || 0) + variantStock;
    const totalReserved = (product.reserved || 0) + variantReserved;
    const availableStock =
      Math.max(0, (product.stock || 0) - (product.reserved || 0)) + availableVariantStock;

    return NextResponse.json({
      product: {
        ...product.toObject(),
        totalStock,
        totalReserved,
        availableStock,
        isOutOfStock: availableStock <= 0,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to get product" }, { status: 500 });
  }
}

export async function adminListProducts(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(200, Number(url.searchParams.get("limit") || 50));
    const query = await buildQueryFromSearchParams(url.searchParams, { admin: true });

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .select("_id title price stock reserved featured isDeleted images category brand variants createdAt")
        .populate("brand", "name")
        .populate("category", "name")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to list admin products" }, { status: 500 });
  }
}

export async function adminCreateProduct(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { body, files } = await parseBodyAndFiles(request);

    const rawPayload = body.payload ? JSON.parse(body.payload) : body;
    const parsedVariants =
      typeof rawPayload.variants === "string" ? JSON.parse(rawPayload.variants) : rawPayload.variants || [];
    const parsedSizes =
      typeof rawPayload.sizes === "string" ? JSON.parse(rawPayload.sizes) : rawPayload.sizes || [];

    const data = createSchema.parse({
      ...rawPayload,
      price: Number(rawPayload.price),
      stock: rawPayload.stock !== undefined ? Number(rawPayload.stock) : 0,
      discount: rawPayload.discount !== undefined ? Number(rawPayload.discount) : 0,
      featured: rawPayload.featured === true || rawPayload.featured === "true",
      tags: rawPayload.tags
        ? Array.isArray(rawPayload.tags)
          ? rawPayload.tags
          : rawPayload.tags.split(",").map((t: string) => t.trim())
        : [],
      sizes: sanitizeSizes(parsedSizes),
      variants: parsedVariants,
    });

    if (!data.variants?.length && data.price === undefined) {
      return NextResponse.json({ message: "Price is required when no variants exist" }, { status: 400 });
    }

    if (data.clothingType === "shoes") {
      if (data.variants?.some((v: any) => v.options?.size && !SHOE_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid shoe size" }, { status: 400 });
      }
    }

    if (data.clothingType === "clothes") {
      if (data.variants?.some((v: any) => v.options?.size && !CLOTHES_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid clothing size" }, { status: 400 });
      }
    }

    if (data.clothingType === "bags") {
      if (data.variants?.some((v: any) => v.options?.size && !BAG_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid bag size" }, { status: 400 });
      }
    }

    if (data.clothingType === "eyeglass") {
      if (data.variants?.some((v: any) => v.options?.size && !EYEGLASS_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid eyeglass size" }, { status: 400 });
      }
    }

    if (!validateSizesByType(data.clothingType, data.sizes)) {
      return NextResponse.json({ message: "Invalid main product sizes" }, { status: 400 });
    }

    if (data.clothingType) {
      const category = await Category.findById(data.category).select("name");
      if (!category || category.name.toLowerCase() !== "clothing") {
        return NextResponse.json(
          { message: "clothingType is only allowed for clothing category" },
          { status: 400 }
        );
      }
    }

    if (data.brand) {
      const validBrand = await Brand.findOne({
        _id: data.brand,
        category: data.category,
        isActive: true,
      });

      if (!validBrand) {
        return NextResponse.json(
          { message: "Selected brand does not belong to selected category" },
          { status: 400 }
        );
      }
    }

    if (data.variants?.length > 0) {
      const duplicateSkus = findDuplicateSkus(data.variants);
      if (duplicateSkus.length > 0) {
        return NextResponse.json(
          { message: `Duplicate variant SKU(s) found: ${duplicateSkus.join(", ")}` },
          { status: 400 }
        );
      }
      data.stock = 0;
    }

    if (!data.variants?.length && data.stock === undefined) {
      data.stock = 0;
    }

    if (!data.sku) {
      data.sku = `${data.title.toUpperCase().replace(/\s+/g, "-")}-${Date.now()}`;
    }

    const images: Array<{ url: string; public_id: string }> = [];

    if (Array.isArray(files)) {
      const mainImages = files.filter((f) => !f.fieldname.startsWith("variant_"));
      for (const file of mainImages) {
        const uploaded: any = await uploadToCloudinary(file.buffer, "products");
        images.push({ url: uploaded.secure_url, public_id: uploaded.public_id });
      }
    }

    const variantFiles = files?.filter((f) => f.fieldname.startsWith("variant_")) || [];
    const uploadedVariants = await Promise.all(
      parsedVariants.map(async (variant: any, idx: number) => {
        const file = variantFiles.find((f) => f.fieldname === `variant_${idx}`);
        let image = variant.image || null;

        if (file) {
          const uploaded: any = await uploadToCloudinary(file.buffer, "variants");
          image = { url: uploaded.secure_url, public_id: uploaded.public_id };
        }

        return { ...variant, image };
      })
    );

    data.variants = uploadedVariants;

    const product = await Product.create({
      title: data.title,
      description: data.description,
      price: data.price,
      stock: data.stock,
      category: toObjectId(data.category),
      brand: data.brand ? toObjectId(data.brand) : null,
      color: data.color ? toObjectId(data.color) : null,
      clothingType: data.clothingType || null,
      sizes: sanitizeSizes(data.sizes),
      tags: data.tags,
      discount: data.discount,
      isDeleted: false,
      featured: data.featured,
      sku: data.sku || "",
      images,
      variants: normalizeVariants(data.variants),
      avgRating: 0,
      reviewsCount: 0,
      createdBy: auth.userId,
    });

    await product.save();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({ product }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: err?.message || "Product creation failed" }, { status: 400 });
  }
}
export async function adminUpdateProduct(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { body, files } = await parseBodyAndFiles(request);

    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const rawPayload = body.payload ? JSON.parse(body.payload) : body;

    const parsedSizes =
      typeof rawPayload.sizes === "string" ? JSON.parse(rawPayload.sizes) : rawPayload.sizes;

    const normalizedTags = rawPayload.tags
      ? Array.isArray(rawPayload.tags)
        ? rawPayload.tags
        : String(rawPayload.tags).split(",").map((t: string) => t.trim())
      : rawPayload.tags;

    const payload = {
      ...rawPayload,
      sizes: parsedSizes,
      tags: normalizedTags,
    };

    const data = updateSchema.parse(payload);

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const update: any = { $set: {} };
    const fields = ["title", "description", "price", "stock", "discount", "featured", "sku", "tags"];
    fields.forEach((f) => {
      if (data[f as keyof typeof data] !== undefined) update.$set[f] = data[f as keyof typeof data];
    });

    if (data.price !== undefined && (!existingProduct.variants || existingProduct.variants.length === 0)) {
      update.$set.price = data.price;
    }

    if (data.clothingType || data.category) {
      const categoryId = data.category || existingProduct.category;
      const category = await Category.findById(categoryId).select("name");

      if (data.clothingType && (!category || category.name.toLowerCase() !== "clothing")) {
        return NextResponse.json(
          { message: "clothingType is only allowed for clothing category" },
          { status: 400 }
        );
      }
    }

    const effectiveClothingType = data.clothingType || existingProduct.clothingType;
    if (Array.isArray(payload.variants) && effectiveClothingType === "shoes") {
      if (payload.variants.some((v: any) => v?.options?.size && !SHOE_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid shoe size" }, { status: 400 });
      }
    }
    if (Array.isArray(payload.variants) && effectiveClothingType === "clothes") {
      if (payload.variants.some((v: any) => v?.options?.size && !CLOTHES_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid clothing size" }, { status: 400 });
      }
    }
    if (Array.isArray(payload.variants) && (effectiveClothingType === "bags" || effectiveClothingType === "bag")) {
      if (payload.variants.some((v: any) => v?.options?.size && !BAG_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid bag size" }, { status: 400 });
      }
    }
    if (Array.isArray(payload.variants) && effectiveClothingType === "eyeglass") {
      if (payload.variants.some((v: any) => v?.options?.size && !EYEGLASS_SIZES.includes(String(v.options.size)))) {
        return NextResponse.json({ message: "Invalid eyeglass size" }, { status: 400 });
      }
    }
    if (data.sizes && !validateSizesByType(effectiveClothingType, data.sizes)) {
      return NextResponse.json({ message: "Invalid main product sizes" }, { status: 400 });
    }

    if (data.brand && mongoose.isValidObjectId(data.brand)) {
      update.$set.brand = data.brand;
    }
    if (data.category && mongoose.isValidObjectId(data.category)) {
      update.$set.category = data.category;
    }
    if (data.color && mongoose.isValidObjectId(data.color)) {
      update.$set.color = data.color;
    }
    if (data.clothingType) {
      update.$set.clothingType = data.clothingType;
    }
    if (data.sizes !== undefined) {
      update.$set.sizes = sanitizeSizes(data.sizes);
    }

    let finalMainImages: Array<{ url: string; public_id: string }> = [];

    if (Array.isArray(payload.images)) {
      finalMainImages = payload.images.map((img: any) => ({
        url: img.url,
        public_id: img.public_id,
      }));
    } else if (!files || files.length === 0) {
      finalMainImages = existingProduct.images || [];
    }

    const payloadPublicIds = new Set(finalMainImages.map((img) => img.public_id));
    const imagesToDelete = (existingProduct.images || []).filter((img: any) => !payloadPublicIds.has(img.public_id));

    if (imagesToDelete.length > 0) {
      await Promise.all(
        imagesToDelete.map(async (img: any) => {
          if (img.public_id) {
            try {
              await cloudinary.uploader.destroy(img.public_id);
            } catch (err: any) {
              console.warn("Failed to delete image from Cloudinary:", img.public_id, err?.message || err);
            }
          }
        })
      );
    }

    if (Array.isArray(files) && files.length > 0) {
      const mainImagesFiles = files.filter((f) => !f.fieldname.startsWith("variant_"));
      for (const file of mainImagesFiles) {
        const uploaded: any = await uploadToCloudinary(file.buffer, "products");
        finalMainImages.push({ url: uploaded.secure_url, public_id: uploaded.public_id });
      }
    }

    update.$set.images = finalMainImages;

    if (Array.isArray(payload.variants)) {
      const duplicateSkus = findDuplicateSkus(payload.variants);
      if (duplicateSkus.length > 0) {
        return NextResponse.json(
          { message: `Duplicate variant SKU(s) found: ${duplicateSkus.join(", ")}` },
          { status: 400 }
        );
      }

      const existingVariants = existingProduct.variants || [];

      const updatedVariants = await Promise.all(
        payload.variants.map(async (variant: any, idx: number) => {
          const existing = variant._id
            ? existingVariants.find((v: any) => v._id.toString() === variant._id)
            : existingVariants.find((v: any) => v.sku === variant.sku);

          let image = existing?.image || null;

          const file = files?.find((f) => f.fieldname === `variant_${idx}`);

          if (file) {
            if (image?.public_id) {
              try {
                await cloudinary.uploader.destroy(image.public_id);
              } catch (err: any) {
                console.warn("Failed to delete variant image:", image.public_id, err?.message || err);
              }
            }

            const uploaded: any = await uploadToCloudinary(file.buffer, "variants");
            image = { url: uploaded.secure_url, public_id: uploaded.public_id };
          }

          return {
            ...(existing ? { _id: existing._id } : {}),
            sku: variant.sku,
            options: variant.options,
            price: Number(variant.price),
            discount: Number(variant.discount) || 0,
            stock: Number(variant.stock),
            image,
          };
        })
      );

      update.$set.variants = normalizeVariants(updatedVariants);
    }

    const product = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    await product?.save();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({ product });
  } catch (err: any) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return NextResponse.json({ message: err?.message || "Failed to update product" }, { status: 400 });
  }
}

export async function adminDeleteProduct(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    if (product.images?.length) {
      await Promise.all(
        product.images.map(async (img: any) => {
          if (img.public_id) {
            try {
              await cloudinary.uploader.destroy(img.public_id);
            } catch (err: any) {
              console.warn("Failed to delete image from Cloudinary:", err?.message || err);
            }
          }
        })
      );
    }

    await Promise.all(
      product.variants.map(async (v: any) => {
        if (v.image?.public_id) {
          try {
            await cloudinary.uploader.destroy(v.image.public_id);
          } catch (err: any) {
            console.warn("Failed to delete variant image:", v.image.public_id, err?.message || err);
          }
        }
      })
    );

    product.isDeleted = true;
    await product.save();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({ message: "Product deleted and images cleared from Cloudinary" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to delete product" }, { status: 500 });
  }
}
export async function adminUpdateProductVariants(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { body, files } = await parseBodyAndFiles(request);

    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const payload = body.payload ? JSON.parse(body.payload) : body;

    if (!Array.isArray(payload.variants)) {
      return NextResponse.json({ message: "Variants array is required" }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const duplicateSkus = findDuplicateSkus(payload.variants);
    if (duplicateSkus.length > 0) {
      return NextResponse.json(
        { message: `Duplicate variant SKU(s) found: ${duplicateSkus.join(", ")}` },
        { status: 400 }
      );
    }

    const updatedVariants = await Promise.all(
      payload.variants.map(async (variant: any, idx: number) => {
        const existing = product.variants.find((v: any) => v.sku === variant.sku);
        let image = existing?.image || { url: "", public_id: "" };

        const field = `variant_${idx}`;
        const file = files?.find((f) => f.fieldname === field);

        if (file) {
          if (image.public_id) {
            try {
              await cloudinary.uploader.destroy(image.public_id);
            } catch (err: any) {
              console.warn("Failed to delete variant image from Cloudinary:", image.public_id, err?.message || err);
            }
          }

          const uploaded: any = await uploadToCloudinary(file.buffer, "variants");
          image = { url: uploaded.secure_url, public_id: uploaded.public_id };
        }

        return { ...variant, image };
      })
    );

    product.variants = normalizeVariants(updatedVariants);
    await product.save();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({ message: "Variants updated", product });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to update variants" }, { status: 400 });
  }
}

export async function adminToggleProductFeatured(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { featured } = await request.json().catch(() => ({}));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    if (typeof featured !== "boolean") {
      return NextResponse.json({ message: "featured must be boolean" }, { status: 400 });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    product.featured = featured;
    await product.save();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({
      message: featured ? "Product marked as featured" : "Product removed from featured",
      product,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to update featured status" }, { status: 500 });
  }
}

export async function adminRestoreProduct(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    if (!product.isDeleted) {
      return NextResponse.json({ message: "Product is not deleted" }, { status: 400 });
    }

    product.isDeleted = false;
    await product.save();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({ message: "Product restored successfully", product });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to restore product" }, { status: 500 });
  }
}

export async function adminHardDeleteProduct(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    if (product.images?.length) {
      await Promise.all(
        product.images.map(async (img: any) => {
          if (img.public_id) {
            try {
              await cloudinary.uploader.destroy(img.public_id);
            } catch (err: any) {
              console.warn("Failed to delete image:", img.public_id, err?.message || err);
            }
          }
        })
      );
    }

    if (product.variants?.length) {
      await Promise.all(
        product.variants.map(async (v: any) => {
          if (v.image?.public_id) {
            try {
              await cloudinary.uploader.destroy(v.image.public_id);
            } catch (err: any) {
              console.warn("Failed to delete variant image:", v.image.public_id, err?.message || err);
            }
          }
        })
      );
    }

    await product.deleteOne();
    invalidateFeaturedCache();
    invalidateListCache();

    return NextResponse.json({ message: "Product permanently deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to hard delete product" }, { status: 500 });
  }
}

export async function adminHardDeleteAllProducts(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const products = await Product.find({ isDeleted: true });

    if (!products.length) {
      return NextResponse.json({ message: "No soft-deleted products to remove" });
    }

    await Promise.all(
      products.map(async (product: any) => {
        if (product.images?.length) {
          await Promise.all(
            product.images.map(async (img: any) => {
              if (img.public_id) {
                try {
                  await cloudinary.uploader.destroy(img.public_id);
                } catch (err: any) {
                  console.warn("Failed to delete image:", img.public_id, err?.message || err);
                }
              }
            })
          );
        }

        await Promise.all(
          product.variants.map(async (v: any) => {
            if (v.image?.public_id) {
              try {
                await cloudinary.uploader.destroy(v.image.public_id);
              } catch (err: any) {
                console.warn("Failed to delete variant image:", v.image.public_id, err?.message || err);
              }
            }
          })
        );
      })
    );

    const result = await Product.deleteMany({ isDeleted: true });
    if (result.deletedCount > 0) {
      invalidateFeaturedCache();
      invalidateListCache();
    }

    return NextResponse.json({ message: `${result.deletedCount} product(s) permanently deleted` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to hard delete products" }, { status: 500 });
  }
}

export async function adminRestoreAllProducts(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const result = await Product.updateMany({ isDeleted: true }, { $set: { isDeleted: false } });
    if (result.modifiedCount > 0) {
      invalidateFeaturedCache();
      invalidateListCache();
    }

    return NextResponse.json({ message: `${result.modifiedCount} product(s) restored` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to restore products" }, { status: 500 });
  }
}
