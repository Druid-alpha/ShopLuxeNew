import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Review from "@/lib/db/models/review";
import Product from "@/lib/db/models/product";
import Order from "@/lib/db/models/order";
import User from "@/lib/db/models/user";
import { requireAuth, requireAdmin } from "@/app/api/_utils/auth";
import { escapeRegex, recalcProductRating, reviewSchema } from "@/app/api/reviews/_shared";

export async function createReview(request: NextRequest, productId: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = reviewSchema.parse(body);

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    const existing = await Review.findOne({ product: productId, user: auth.userId });
    if (existing) return NextResponse.json({ message: "You already reviewed this product" }, { status: 400 });

    const hasOrdered = await Order.findOne({
      user: auth.userId,
      "items.product": productId,
      paymentStatus: "paid",
    });

    const review = await Review.create({
      product: productId,
      user: auth.userId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      isVerified: !!hasOrdered,
    });

    await recalcProductRating(productId);

    return NextResponse.json({ review }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: err?.message || "Failed to create review" }, { status: 400 });
  }
}

export async function updateReview(request: NextRequest, reviewId: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = reviewSchema.parse(body);

    const review = await Review.findById(reviewId);
    if (!review) return NextResponse.json({ message: "Review not found" }, { status: 404 });

    if (!review.user.equals(auth.userId) && auth.role !== "admin") {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    review.rating = data.rating;
    review.title = data.title;
    review.body = data.body;

    await review.save();
    await recalcProductRating(String(review.product));

    return NextResponse.json({ review });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to update review" }, { status: 400 });
  }
}

export async function deleteReview(request: NextRequest, reviewId: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review) return NextResponse.json({ message: "Review not found" }, { status: 404 });

    if (!review.user.equals(auth.userId) && auth.role !== "admin") {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    await review.deleteOne();
    await recalcProductRating(String(review.product));

    return NextResponse.json({ message: "Review deleted" });
  } catch {
    return NextResponse.json({ message: "Failed to delete review" }, { status: 500 });
  }
}

export async function getReviewsForProduct(request: NextRequest, productId: string) {
  await connectDB();

  try {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") || "";

    let sortQuery: any = { createdAt: -1 };
    if (sort === "highest") sortQuery = { rating: -1 };
    if (sort === "lowest") sortQuery = { rating: 1 };

    const reviews = await Review.find({ product: productId })
      .populate("user", "name avatar")
      .sort(sortQuery);

    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ message: "Failed to load reviews" }, { status: 500 });
  }
}

export async function getFeaturedReviews() {
  await connectDB();

  try {
    const reviews = await Review.find({ isFeatured: true })
      .populate("user", "name avatar")
      .populate("product", "title")
      .sort({ createdAt: -1 });

    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ message: "Failed to fetch featured reviews" }, { status: 500 });
  }
}

export async function listAllReviews(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Number(url.searchParams.get("limit") || 20));

    const query: any = {};
    const andConditions: any[] = [];

    const rating = Number(url.searchParams.get("rating"));
    if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
      andConditions.push({ rating });
    }

    const verified = String(url.searchParams.get("verified") || "").toLowerCase();
    if (verified === "verified" || verified === "true") {
      andConditions.push({ isVerified: true });
    } else if (verified === "guest" || verified === "false") {
      andConditions.push({ isVerified: { $ne: true } });
    }

    const featured = String(url.searchParams.get("featured") || "").toLowerCase();
    if (featured === "featured" || featured === "true") {
      andConditions.push({ isFeatured: true });
    } else if (featured === "not_featured" || featured === "false") {
      andConditions.push({ isFeatured: { $ne: true } });
    }

    const search = String(url.searchParams.get("search") || "").trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const [userIds, productIds] = await Promise.all([
        User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id").limit(50),
        Product.find({ title: regex }).select("_id").limit(50),
      ]);

      andConditions.push({
        $or: [
          { title: regex },
          { body: regex },
          { user: { $in: userIds.map((u: any) => u._id) } },
          { product: { $in: productIds.map((p: any) => p._id) } },
        ],
      });
    }

    if (andConditions.length > 0) query.$and = andConditions;

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate("user", "name email avatar")
      .populate("product", "title images")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({ reviews, total, pages: Math.ceil(total / limit), page });
  } catch {
    return NextResponse.json({ message: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function toggleFeaturedReview(request: NextRequest, reviewId: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review) return NextResponse.json({ message: "Review not found" }, { status: 404 });

    review.isFeatured = !review.isFeatured;
    await review.save();

    return NextResponse.json({ message: "Review featured status updated", isFeatured: review.isFeatured });
  } catch {
    return NextResponse.json({ message: "Failed to toggle featured status" }, { status: 500 });
  }
}

export async function adminDeleteReview(request: NextRequest, reviewId: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review) return NextResponse.json({ message: "Review not found" }, { status: 404 });

    const productId = String(review.product);
    await review.deleteOne();
    await recalcProductRating(productId);

    return NextResponse.json({ message: "Review deleted" });
  } catch {
    return NextResponse.json({ message: "Failed to delete review" }, { status: 500 });
  }
}

export async function toggleHelpful(request: NextRequest, reviewId: string) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review) return NextResponse.json({ message: "Review not found" }, { status: 404 });

    const index = review.helpfulUsers.indexOf(auth.userId);
    if (index === -1) {
      review.helpfulUsers.push(auth.userId as any);
      review.helpful += 1;
    } else {
      review.helpfulUsers.splice(index, 1);
      review.helpful -= 1;
    }

    await review.save();
    return NextResponse.json({ helpful: review.helpful, isHelpful: index === -1 });
  } catch {
    return NextResponse.json({ message: "Failed to update helpful vote" }, { status: 500 });
  }
}
