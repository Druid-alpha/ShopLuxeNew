import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/user";
import { uploadToCloudinary } from "@/lib/middleware/upload";
import { parseBodyAndFiles } from "@/app/api/_utils/request";
import { requireAuth, requireAdmin } from "@/app/api/_utils/auth";

export async function getMe(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const user = await User.findById(auth.userId).select("-password -refreshTokens");
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function updateMe(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const schema = z.object({ name: z.string().min(2) });
    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);

    const user = await User.findByIdAndUpdate(auth.userId, { name: data.name }, { new: true, runValidators: true })
      .select("-password -refreshTokens");

    return NextResponse.json({ message: "Profile updated", user });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Server error" }, { status: 400 });
  }
}

export async function updateAvatar(request: NextRequest) {
  await connectDB();

  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { body, files } = await parseBodyAndFiles(request);
    const file = files?.[0];
    if (!file || !file.buffer) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const result: any = await uploadToCloudinary(file.buffer, "avatars");

    const { name } = body || {};
    const updates: any = { avatar: result.secure_url };
    if (name) updates.name = name;

    const user = await User.findByIdAndUpdate(auth.userId, updates, { new: true })
      .select("-password -refreshTokens");

    return NextResponse.json({ message: "Avatar updated", user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function adminListUsers(request: NextRequest) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const url = new URL(request.url);
    const sortBy = url.searchParams.get("sortBy");
    const sort = url.searchParams.get("sort");

    let sortField = "createdAt";
    let sortOrder = -1;

    if (sortBy === "created-1" || sort === "created-1") {
      sortField = "createdAt";
      sortOrder = -1;
    } else if (sortBy === "created1" || sort === "created1") {
      sortField = "createdAt";
      sortOrder = 1;
    } else if (sortBy === "joined" || sort === "joined") {
      sortField = "createdAt";
      sortOrder = -1;
    }

    const users = await User.find({ isDeleted: { $ne: true } })
      .select("-password -refreshTokens")
      .sort({ [sortField]: sortOrder });

    return NextResponse.json({ users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function adminUpdateUser(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, role } = body || {};

    if (role && !["user", "admin"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .select("-password -refreshTokens");

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}

export async function adminDeleteUser(request: NextRequest, id: string) {
  await connectDB();

  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const user = await User.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .select("-password -refreshTokens");

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "User deleted", user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}
