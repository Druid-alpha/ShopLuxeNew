"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/user";
import sendEmail from "@/lib/utils/sendEmail";
import { signAccessToken, signRefreshToken } from "@/lib/config/tokenService";
import { buildCookieOptions } from "@/app/api/_utils/cookies";
import { loginSchema, normalizeEmail, registerSchema, safeErrorMessage } from "@/app/api/auth/_shared";

export type AuthActionState = {
  ok: boolean;
  message?: string;
};

const setAuthCookies = async (accessToken: string, refreshToken: string) => {
  const jar = await cookies();
  const accessOptions = buildCookieOptions(60 * 60 * 1000) as any;
  const refreshOptions = buildCookieOptions(7 * 24 * 60 * 60 * 1000) as any;
  jar.set("accessToken", accessToken, accessOptions);
  jar.set("refreshToken", refreshToken, refreshOptions);
};

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await connectDB();

  try {
    const raw = Object.fromEntries(formData.entries());
    const data = loginSchema.parse(raw);
    const email = normalizeEmail(String(data.email));

    const user = await User.findOne({ email });
    if (!user) return { ok: false, message: "Invalid credentials" };
    if (user.isDeleted) return { ok: false, message: "User is removed" };

    const ok = await bcrypt.compare(String(data.password), String(user.password));
    if (!ok) return { ok: false, message: "Invalid credentials" };
    if (!user.emailVerified) return { ok: false, message: "Email not verified" };

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    user.refreshTokens.push({ token: refreshToken });
    user.lastSignedIn = new Date();
    user.isOnline = true;
    await user.save();

    await setAuthCookies(accessToken, refreshToken);

    const returnTo = String(raw.returnTo || "/profile");
    redirect(returnTo);
  } catch (error: any) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function registerAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await connectDB();

  try {
    const raw = Object.fromEntries(formData.entries());
    const data = registerSchema.parse(raw);
    const email = normalizeEmail(String(data.email));

    const existing = await User.findOne({ email });
    if (existing && existing.emailVerified) {
      return { ok: false, message: "Email already exists" };
    }

    let user = existing;
    if (!user) {
      const saltRound = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(String(data.password), saltRound);
      user = await User.create({
        name: data.name,
        email,
        password: hashed,
      });
    } else if (data.password) {
      const saltRound = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(String(data.password), saltRound);
      if (data.name) user.name = data.name;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 1000 * 60 * 10;
    user.otpAttempts = 0;
    user.otpBlockedUntil = undefined as any;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Verify your ShopLuxe account",
      title: "Email Verification",
      preheader: "Your verification code is inside.",
      htmlContent: `
        <h1>Verify your email address</h1>
        <p>Hello ${user.name.split(" ")[0]},</p>
        <p>Use the verification code below to complete your signup.</p>
        <div class="otp-box">
          <p class="otp-code">${otp}</p>
        </div>
        <div class="card">
          <p class="muted">For your security:</p>
          <ul class="list">
            <li>Never share this code with anyone.</li>
            <li>This code expires in 10 minutes.</li>
          </ul>
        </div>
      `,
    });

    user.lastOtpSentAt = new Date();
    await user.save();

    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  } catch (error: any) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function forgotPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await connectDB();

  try {
    const raw = Object.fromEntries(formData.entries());
    const email = normalizeEmail(String(raw.email || ""));
    if (!email) return { ok: false, message: "Email field is required" };

    const user = await User.findOne({ email });
    if (!user) {
      return { ok: true, message: "If email exists, reset link sent" };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetToken = hashedToken;
    user.resetTokenExpires = Date.now() + 1000 * 60 * 30;
    await user.save();

    const baseUrl =
      process.env.CLIENT_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your ShopLuxe password",
      title: "Password Reset",
      preheader: "A password reset was requested for your account.",
      htmlContent: `
        <h1>Password reset request</h1>
        <p>Hello ${user.name.split(" ")[0]},</p>
        <p>We received a request to reset your password. Click the button below to continue.</p>
        <div style="text-align:center; margin:20px 0;">
          <a class="button" href="${resetLink}">Reset Password</a>
        </div>
        <p class="muted" style="margin-top: 20px;">This link expires in 30 minutes. If you didn't request a reset, you can ignore this email.</p>
      `,
      text: `Reset your ShopLuxe password: ${resetLink}`,
    });

    return { ok: true, message: "Password reset email sent" };
  } catch (error: any) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
