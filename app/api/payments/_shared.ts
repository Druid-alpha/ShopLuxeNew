import path from "path";
import fs from "fs";
import os from "os";
import PDFDocument from "pdfkit";
import Product from "@/lib/db/models/product";
import cloudinary from "@/lib/config/cloudinary";
import { resolveColorId } from "@/lib/utils/reservation";

export const normalizeRefundAmount = (orderTotal: number, amount: any) => {
  if (!amount) return null;
  const numeric = Number(amount);
  if (Number.isNaN(numeric) || numeric <= 0) return null;
  return Math.min(numeric, Number(orderTotal || 0));
};

export const findVariantsByOptions = async (product: any, size: any, color: any) => {
  if (!product?.variants?.length) return [];
  const sizeKey = String(size || "").trim();
  const colorProvided = color !== null && color !== undefined && String(color).trim() !== "";
  const colorId = await resolveColorId(color);
  const hasColoredVariants = product.variants.some((v: any) => v?.options?.color);

  if (!sizeKey && !colorId) return [];
  if (colorProvided && !colorId && hasColoredVariants) return [];

  return product.variants.filter((v: any) => {
    const vSize = String(v?.options?.size || "").trim();
    const vColor = String(v?.options?.color?._id || v?.options?.color || "");
    if (sizeKey && colorId) return vSize === sizeKey && vColor === colorId;
    if (colorId) return vColor === colorId;
    if (sizeKey && !colorProvided) return vSize === sizeKey;
    if (sizeKey && !colorId && !hasColoredVariants) return vSize === sizeKey;
    return false;
  });
};

export const resolveVariantForItem = async (product: any, item: any) => {
  if (!product?.variants?.length) return { variant: null, reason: "no_variants" };
  const variant = item?.variant || {};
  const hasId = !!variant?._id;
  const hasSku = !!variant?.sku;
  const hasOptions = !!(variant?.size || variant?.color);

  if (hasId) {
    const match = product.variants.find((v: any) => String(v._id) === String(variant._id)) || null;
    if (!match) return { variant: null, reason: "missing_id" };
    return { variant: match, reason: "id" };
  }

  if (hasSku) {
    const matches = product.variants.filter((v: any) => v.sku === variant.sku);
    if (matches.length === 1) return { variant: matches[0], reason: "sku" };
    if (matches.length > 1) return { variant: null, reason: "ambiguous_sku" };
    return { variant: null, reason: "missing_sku" };
  }

  if (hasOptions) {
    const matches = await findVariantsByOptions(product, variant.size, variant.color);
    if (matches.length === 1) return { variant: matches[0], reason: "options" };
    if (matches.length > 1) return { variant: null, reason: "ambiguous_options" };
    return { variant: null, reason: "missing_options" };
  }

  return { variant: null, reason: "no_variant" };
};

export async function generateInvoice(order: any) {
  const invoiceName = `invoice-${order._id}.pdf`;
  const tmpPath = path.join(os.tmpdir(), invoiceName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(tmpPath);
  doc.pipe(stream);

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
      `   Qty: ${item.qty}  x  ₦${(item.priceAtPurchase || 0).toLocaleString()}  =  ₦${lineTotal.toLocaleString()}`,
      { indent: 10 }
    );
    doc.moveDown(0.3);
  });

  doc.text("------------------------------------------------------------------");
  doc.moveDown();

  doc.fontSize(14).font("Helvetica-Bold").text(`TOTAL PAID: ₦${(order.totalAmount || 0).toLocaleString()}`, {
    align: "right",
  });

  doc.moveDown(2);
  doc.fontSize(9).font("Helvetica").text(
    "Thank you for shopping with ShopLuxe. We appreciate your business!",
    { align: "center" }
  );

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

