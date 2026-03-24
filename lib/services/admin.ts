import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Order from "@/lib/db/models/order";
import Product from "@/lib/db/models/product";
import Color from "@/lib/db/models/Color";
import Category from "@/lib/db/models/Category";
import { releaseOrderReservations } from "@/lib/utils/reservation";
import { requireAdmin } from "@/app/api/_utils/auth";

const escapeCsv = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  if (/[",\n]/.test(str)) return `"${str}"`;
  return str;
};

export async function exportOrdersCsv(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const orders = await Order.find({})
    .populate("user", "email name")
    .select("totalAmount status paymentStatus paymentRef returnStatus refundAmount createdAt shippingAddress")
    .lean();

  const header = [
    "id",
    "customer",
    "email",
    "total",
    "status",
    "paymentStatus",
    "paymentRef",
    "returnStatus",
    "refundAmount",
    "state",
    "city",
    "createdAt",
  ];
  const rows = orders.map((o: any) => [
    o._id,
    o.user?.name || "",
    o.user?.email || "",
    o.totalAmount,
    o.status,
    o.paymentStatus,
    o.paymentRef,
    o.returnStatus,
    o.refundAmount,
    o.shippingAddress?.state || "",
    o.shippingAddress?.city || "",
    o.createdAt,
  ]);
  const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-${Date.now()}.csv"`,
    },
  });
}

export async function exportProductsCsv(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const products = await Product.find({})
    .populate("category", "name")
    .populate("brand", "name")
    .select("title price stock discount category brand isDeleted createdAt")
    .lean();

  const header = ["id", "title", "price", "stock", "discount", "category", "brand", "deleted", "createdAt"];
  const rows = products.map((p: any) => [
    p._id,
    p.title,
    p.price,
    p.stock,
    p.discount,
    p.category?.name || "",
    p.brand?.name || "",
    p.isDeleted ? "yes" : "no",
    p.createdAt,
  ]);
  const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="products-${Date.now()}.csv"`,
    },
  });
}

export async function bulkDeleteOrders(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const body = await request.json().catch(() => ({}));
    const { orderIds = [] } = body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: "orderIds array is required" }, { status: 400 });
    }

    const ids = orderIds
      .filter((id: string) => mongoose.isValidObjectId(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
    if (ids.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: "No valid orderIds provided" }, { status: 400 });
    }

    const orders = await Order.find({ _id: { $in: ids } }).session(session);
    for (const order of orders) {
      if (order.status === "pending" && order.paymentStatus === "pending") {
        await releaseOrderReservations(order, session);
      }
    }

    const result = await Order.deleteMany({ _id: { $in: ids } }, { session });
    await session.commitTransaction();
    session.endSession();
    return NextResponse.json({ deleted: result.deletedCount || 0 });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("[ADMIN] Bulk delete orders failed:", error);
    return NextResponse.json({ message: "Failed to delete orders" }, { status: 500 });
  }
}

const normalizeHex = (value: string) => {
  if (!value) return "";
  let h = String(value).trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return /^#[0-9a-f]{6}$/i.test(h) ? h : "";
};

const isHexLike = (value: string) => /^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(String(value || ""));
const escapeRegex = (value: string) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titleCase = (value?: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

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

const familyFromHex = (hex: string) => {
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

const HEX_NAME_MAP: Record<string, string> = {
  "#000000": "Midnight Black",
  "#0f172a": "Midnight",
  "#111111": "Jet Black",
  "#1f2937": "Charcoal",
  "#374151": "Graphite",
  "#6b7280": "Slate Gray",
  "#9ca3af": "Steel Gray",
  "#d1d5db": "Silver",
  "#e5e7eb": "Cloud",
  "#f5f5f5": "Soft White",
  "#ffffff": "Pure White",
  "#ef4444": "Crimson",
  "#f97316": "Tangerine",
  "#f59e0b": "Amber",
  "#facc15": "Gold",
  "#22c55e": "Emerald",
  "#14b8a6": "Teal",
  "#3b82f6": "Royal Blue",
  "#6366f1": "Indigo",
  "#8b5cf6": "Violet",
  "#ec4899": "Rose",
  "#efeae6": "Pearl White",
  "#656b83": "Slate Blue",
};

type CreateColorPayload = {
  name?: string;
  hex?: string;
  category?: string;
};

export async function createAdminColor(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const payload = (await request.json().catch(() => ({}))) as CreateColorPayload;

  try {
    const { name, hex, category } = payload || {};
    if (!hex || !category) {
      return NextResponse.json({ message: "Hex and category are required" }, { status: 400 });
    }

    const normalizedHex = normalizeHex(hex);
    if (!normalizedHex) {
      return NextResponse.json({ message: "Invalid hex format" }, { status: 400 });
    }
    const inputName = String(name || "").trim();
    const allowNameMatch = !!(inputName && !(inputName.startsWith("#") || isHexLike(inputName)));
    const resolvedName = allowNameMatch
      ? inputName
      : HEX_NAME_MAP[normalizedHex] || titleCase(familyFromHex(normalizedHex)) || normalizedHex.toUpperCase();

    let categoryId: any = category;
    if (!mongoose.isValidObjectId(category)) {
      const foundCategory = await Category.findOne({
        name: new RegExp(`^${escapeRegex(category)}$`, "i"),
      }).select("_id");
      if (!foundCategory?._id) {
        return NextResponse.json({ message: "Invalid category" }, { status: 400 });
      }
      categoryId = foundCategory._id;
    }

    let color = await Color.findOne({
      hex: normalizedHex,
      category: categoryId,
    });

    if (!color && allowNameMatch) {
      color = await Color.findOne({
        name: new RegExp(`^${escapeRegex(resolvedName)}$`, "i"),
        category: categoryId,
      });
    }

    if (!color) {
      color = await Color.create({ name: resolvedName, hex: normalizedHex, category: categoryId });
    }

    return NextResponse.json({ color }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      const { name, hex, category } = payload || {};
      const normalizedHex = normalizeHex(hex);
      const inputName = String(name || "").trim();
      const allowNameMatch = !!(inputName && !(inputName.startsWith("#") || isHexLike(inputName)));
      const resolvedName = allowNameMatch
        ? inputName
        : HEX_NAME_MAP[normalizedHex] || titleCase(familyFromHex(normalizedHex)) || normalizedHex.toUpperCase();
      let categoryId: any = category;
      if (!mongoose.isValidObjectId(category)) {
        const foundCategory = await Category.findOne({
          name: new RegExp(`^${escapeRegex(category)}$`, "i"),
        }).select("_id");
        if (!foundCategory?._id) {
          return NextResponse.json({ message: "Invalid category" }, { status: 400 });
        }
        categoryId = foundCategory._id;
      }
      const existingByHex = await Color.findOne({ category: categoryId, hex: normalizedHex });
      if (existingByHex) {
        return NextResponse.json({ color: existingByHex }, { status: 200 });
      }
      const uniqueName = `${resolvedName} ${normalizedHex.toUpperCase()}`.trim();
      const created = await Color.create({ name: uniqueName, hex: normalizedHex, category: categoryId });
      return NextResponse.json({ color: created }, { status: 201 });
    }

    return NextResponse.json(
      { message: "Failed to create color", error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
