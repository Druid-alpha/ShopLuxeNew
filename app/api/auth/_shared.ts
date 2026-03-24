import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const normalizeEmail = (value?: string) => String(value || "").trim().toLowerCase();

export const safeErrorMessage = (error: any) =>
  process.env.NODE_ENV === "production" ? "Server error" : error?.message || "Server error";

