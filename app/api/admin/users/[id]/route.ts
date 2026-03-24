import type { NextRequest } from "next/server";
import { adminDeleteUser, adminUpdateUser } from "@/lib/services/users";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminUpdateUser(request, (await params).id);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminDeleteUser(request, (await params).id);
}
