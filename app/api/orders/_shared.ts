import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import os from "os";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import Color from "@/lib/db/models/Color";
import Product from "@/lib/db/models/product";
import cloudinary from "@/lib/config/cloudinary";

export const RESERVATION_WINDOW_MS = 10 * 60 * 1000;
export const RETURN_WINDOW_DAYS = 7;

export const canRequestReturn = (order: any) => {
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.paymentStatus !== "paid") return { ok: false, reason: "Order not paid" };
  if (order.returnStatus && order.returnStatus !== "none") return { ok: false, reason: "Return already requested" };

  const anchor = order.deliveredAt || order.updatedAt || order.createdAt;
  if (!anchor) return { ok: false, reason: "Return window unavailable" };
  const windowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (order.status === "delivered" && Date.now() - new Date(anchor).getTime() > windowMs) {
    return { ok: false, reason: "Return window expired" };
  }
  return { ok: true };
};

export const statusEmailContent = (order: any, status: string) => {
  const statusLabel = String(status || "").toUpperCase();
  return `
    <h1>Order update: ${statusLabel}</h1>
    <div class="card">
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p class="meta">We'll keep you updated as your order progresses.</p>
    </div>
    <div style="text-align:center; margin:20px 0;">
      <a class="button" href="${process.env.CLIENT_URL}/orders/${order._id}">View Order</a>
    </div>
  `;
};

export function buildPublicInvoiceUrl(orderId: string, version?: number | null) {
  return cloudinary.url(`invoices/invoice-${orderId}`, {
    resource_type: "raw",
    type: "upload",
    format: "pdf",
    secure: true,
    ...(version ? { version } : {}),
  });
}

export function buildSignedInvoiceUrl(orderId: string, version?: number | null) {
  return cloudinary.url(`invoices/invoice-${orderId}`, {
    resource_type: "raw",
    type: "upload",
    format: "pdf",
    secure: true,
    sign_url: true,
    ...(version ? { version } : {}),
  });
}

export function getVersionFromUrl(url?: string | null) {
  if (!url) return null;
  const match = String(url).match(/\/v(\d+)\//);
  return match ? Number(match[1]) : null;
}

const resolveColorLabelCache = new Map<string, string>();
export const resolveColorLabel = async (raw: any) => {
  if (!raw) return null;
  if (typeof raw === "object") {
    if (raw.name) return raw.name;
    if (raw.hex) return raw.hex;
    if (raw._id) raw = raw._id;
    else return null;
  }
  const key = String(raw);
  if (mongoose.Types.ObjectId.isValid(key)) {
    if (resolveColorLabelCache.has(key)) return resolveColorLabelCache.get(key);
    const c = await Color.findById(key).select("name hex").lean();
    const label = c?.name || c?.hex || key;
    resolveColorLabelCache.set(key, label);
    return label;
  }
  return key;
};

export const escapeRegex = (value: string) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const resolveColorRef = async (raw: any) => {
  if (!raw) return { provided: false, id: null, label: null };

  if (typeof raw === "object") {
    const id = raw._id ? String(raw._id) : null;
    const label = raw.name || raw.hex || null;
    if (id) return { provided: true, id, label };
    if (!label) return { provided: false, id: null, label: null };

    const found = await Color.findOne({
      $or: [{ name: new RegExp(`^${escapeRegex(label)}$`, "i") }, { hex: new RegExp(`^${escapeRegex(label)}$`, "i") }],
    })
      .select("_id name hex")
      .lean();

    if (found) {
      return { provided: true, id: String(found._id), label: found.name || found.hex || label };
    }
    return { provided: true, id: null, label };
  }

  const rawStr = String(raw || "").trim();
  if (!rawStr) return { provided: false, id: null, label: null };
  if (mongoose.Types.ObjectId.isValid(rawStr)) return { provided: true, id: rawStr, label: null };

  const label = rawStr;
  const found = await Color.findOne({
    $or: [{ name: new RegExp(`^${escapeRegex(label)}$`, "i") }, { hex: new RegExp(`^${escapeRegex(label)}$`, "i") }],
  })
    .select("_id name hex")
    .lean();

  if (found) {
    return { provided: true, id: String(found._id), label: found.name || found.hex || label };
  }
  return { provided: true, id: null, label };
};

export const findVariantsByOptions = async (product: any, size: any, color: any) => {
  if (!product?.variants?.length) return [];

  const sizeKey = String(size || "");
  const colorInfo = await resolveColorRef(color);
  const colorProvided = colorInfo.provided;
  const colorId = colorInfo.id;
  const productHasColoredVariants = product.variants.some((v: any) => v?.options?.color);

  if (!sizeKey && !colorProvided) return [];
  if (colorProvided && !colorId) return [];
  if (!colorProvided && sizeKey && productHasColoredVariants) return [];

  return product.variants.filter((v: any) => {
    const vSize = String(v?.options?.size || "");
    const vColorId = String(v?.options?.color || "");
    if (sizeKey && colorId) return vSize === sizeKey && vColorId === colorId;
    if (sizeKey && !colorProvided) return vSize === sizeKey;
    if (!sizeKey && colorId) return vColorId === colorId;
    return false;
  });
};

export const resolveVariantForCartItem = async (product: any, variantInput: any = {}) => {
  if (!product?.variants?.length) return null;
  const variantObj = typeof variantInput === "object" ? variantInput : {};
  const sku = typeof variantInput === "string" ? variantInput : variantObj.sku || null;
  const size = typeof variantInput === "object" ? variantObj.size || null : null;
  const color = typeof variantInput === "object" ? variantObj.color || null : null;
  const id = typeof variantInput === "object" ? variantObj._id || null : null;

  if (id) {
    const match = product.variants.find((v: any) => String(v._id) === String(id));
    if (match) return match;
    return null;
  }

  if (sku) {
    const matches = product.variants.filter((v: any) => v.sku === sku);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1 && (size || color)) {
      const refined = matches.filter((v: any) => {
        const vSize = String(v?.options?.size || "");
        const vColorId = String(v?.options?.color || "");
        const sizeKey = String(size || "");
        const colorKey = String(color || "");
        const sizeMatch = sizeKey ? vSize === sizeKey : true;
        const colorMatch = colorKey ? vColorId === colorKey : true;
        return sizeMatch && colorMatch;
      });
      if (refined.length === 1) return refined[0];
    }
    return null;
  }

  if (size || color) {
    const matches = await findVariantsByOptions(product, size, color);
    if (matches.length === 1) return matches[0];
    return null;
  }

  return null;
};

const writeInvoiceDoc = (doc: PDFDocument, order: any) => {
  doc.fontSize(22).font("Helvetica-Bold").text("SHOPLUXE", { align: "center" });
  doc.fontSize(10).font("Helvetica").text("Zone 7, Ota-Efun Osogbo, Osun, Nigeria", { align: "center" });
  doc.text("support@shopluxe.com", { align: "center" });
  doc.moveDown(1.5);
  doc.fontSize(18).font("Helvetica-Bold").text("OFFICIAL INVOICE", { align: "center" });
  doc.moveDown();

  doc.fontSize(11).font("Helvetica");
  doc.text(`Invoice No: ${order._id}`);
  doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", { dateStyle: "full" })}`);
  doc.text(`Payment Status: ${order.paymentStatus?.toUpperCase() || "PAID"}`);
  doc.moveDown();

  const addr = order.shippingAddress;
  if (addr?.fullName) {
    doc.font("Helvetica-Bold").text("Billed To:");
    doc.font("Helvetica");
    doc.text(addr.fullName);
    if (addr.phone) doc.text(`Phone: ${addr.phone}`);
    if (addr.address) doc.text(addr.address);
    if (addr.city || addr.state) doc.text(`${addr.city || ""}${addr.city && addr.state ? ", " : ""}${addr.state || ""}`);
    doc.text("Nigeria");
    doc.moveDown();
  }

  doc.font("Helvetica-Bold");
  doc.text("ITEMS", { underline: true });
  doc.moveDown(0.5);
  doc.font("Helvetica");
  doc.text("------------------------------------------------------------------");

  const normalizeColorLabel = (raw: any) => {
    if (!raw) return "";
    if (typeof raw === "object") {
      if (raw.name) return raw.name;
      if (raw.hex) return raw.hex;
    }
    return String(raw);
  };

  const sizeLabelForItem = (item: any) => {
    const type = String(item?.clothingType || "").toLowerCase();
    if (["clothes", "shoes", "bags", "bag", "eyeglass"].includes(type)) return "Size";
    return "Spec";
  };

  order.items.forEach((item: any, i: number) => {
    const variantParts: string[] = [];
    if (item.variant?.sku) variantParts.push(`SKU ${item.variant.sku}`);
    const colorLabel = normalizeColorLabel(item.variant?.color);
    if (colorLabel) variantParts.push(`Color ${colorLabel}`);
    if (item.variant?.size) variantParts.push(`${sizeLabelForItem(item)} ${item.variant.size}`);
    const variantInfo = variantParts.length > 0 ? ` [${variantParts.join(" | ")}]` : "";
    const itemName = item.title || "Product";
    const lineTotal = (item.priceAtPurchase || 0) * item.qty;
    doc.font("Helvetica-Bold").text(`${i + 1}. ${itemName}${variantInfo}`);
    doc.font("Helvetica").text(
      `   Qty: ${item.qty}  x  N${(item.priceAtPurchase || 0).toLocaleString()}  =  N${lineTotal.toLocaleString()}`,
      { indent: 10 }
    );
    doc.moveDown(0.3);
  });

  doc.text("------------------------------------------------------------------");
  doc.moveDown();
  doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL PAID: N${(order.totalAmount || 0).toLocaleString()}`, {
    align: "right",
  });
  doc.moveDown(2);
  doc.fontSize(9).font("Helvetica").text("Thank you for shopping with ShopLuxe. We appreciate your business!", {
    align: "center",
  });
};

export async function generateInvoiceBuffer(order: any) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    writeInvoiceDoc(doc, order);
    doc.end();
  });
}

export async function generateInvoiceForOrder(order: any) {
  const invoiceName = `invoice-${order._id}.pdf`;
  const tmpPath = path.join(os.tmpdir(), invoiceName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(tmpPath);
  doc.pipe(stream);

  writeInvoiceDoc(doc, order);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const uploaded = await cloudinary.uploader.upload(tmpPath, {
    folder: "invoices",
    resource_type: "raw",
    public_id: `invoice-${order._id}`,
  });

  order.invoiceUrl = uploaded.secure_url;
  await order.save();

  if (fs.existsSync(tmpPath)) fs.unlink(tmpPath, () => {});

  return order.invoiceUrl;
}

