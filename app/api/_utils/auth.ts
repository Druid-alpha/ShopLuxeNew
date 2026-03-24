import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import User from "@/lib/db/models/user";

type AuthResult =
  | { ok: true; userId: string; role: string; status?: number; message?: string }
  | { ok: false; status: number; message: string; userId?: string; role?: string };

const getBearer = (request: NextRequest) => {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return "";
  return auth.split(" ")[1] || "";
};

export const requireAuth = async (request: NextRequest): Promise<AuthResult> => {
  const cookieToken = request.cookies.get("accessToken")?.value || "";
  const token = cookieToken || getBearer(request);

  if (!token) {
    return { ok: false, status: 401, message: "No access token" };
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "") as { id?: string };
    if (!decoded?.id) return { ok: false, status: 401, message: "Invalid or expired token" };

    const user = await User.findById(decoded.id).select("id role");
    if (!user) return { ok: false, status: 401, message: "User not found" };

    return { ok: true, userId: String(user._id), role: String(user.role || "").toLowerCase() };
  } catch {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }
};

export const requireAdmin = async (request: NextRequest): Promise<AuthResult> => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (auth.role !== "admin") {
    return { ok: false, status: 403, message: "Admin only" };
  }
  return auth;
};

