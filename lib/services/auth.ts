import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import User from "@/lib/db/models/user";
import sendEmail from "@/lib/utils/sendEmail";
import handleZodError from "@/lib/utils/handleZodError";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "@/lib/config/tokenService";
import { buildCookieOptions } from "@/app/api/_utils/cookies";
import { parseBodyAndFiles } from "@/app/api/_utils/request";
import { loginSchema, normalizeEmail, registerSchema, safeErrorMessage } from "@/app/api/auth/_shared";

export async function register(request: NextRequest) {
  await connectDB();

  try {
    const { body } = await parseBodyAndFiles(request);
    const data = registerSchema.parse(body);
    const email = normalizeEmail(data.email);

    const existing = await User.findOne({ email });

    if (existing) {
      if (!existing.emailVerified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        existing.otp = otp;
        existing.otpExpires = Date.now() + 1000 * 60 * 10;
        existing.otpAttempts = 0;
        existing.otpBlockedUntil = undefined as any;

        if (data.name) existing.name = data.name;
        if (data.password) {
          const saltRound = await bcrypt.genSalt(10);
          existing.password = await bcrypt.hash(data.password, saltRound);
        }

        await existing.save();

        try {
          await sendEmail({
            to: existing.email,
            subject: "Verify your ShopLuxe account",
            title: "Email Verification",
            preheader: "Your verification code is inside.",
            htmlContent: `
                          <h1>Verify your email address</h1>
                          <p>Hello ${existing.name.split(" ")[0]},</p>
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
        } catch (emailErr: any) {
          return NextResponse.json({ success: false, message: safeErrorMessage(emailErr) }, { status: 500 });
        }

        existing.lastOtpSentAt = new Date();
        await existing.save();

        return NextResponse.json(
          { success: true, message: "Email not verified. New OTP sent." },
          { status: 200 }
        );
      }
      return NextResponse.json({ success: false, message: "email already exists" }, { status: 400 });
    }

    const saltRound = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(data.password, saltRound);

    const user = await User.create({
      name: data.name,
      email,
      password: hashed,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 1000 * 60 * 10;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your ShopLuxe account",
        title: "Email Verification",
        preheader: "Your verification code is inside.",
        htmlContent: `
                  <h1>Verify your email address</h1>
                  <p>Hello ${user.name.split(" ")[0]},</p>
                  <p>Thanks for joining ShopLuxe. Use the verification code below to complete your signup.</p>
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
                  <div class="divider"></div>
                  <p class="muted">If you didn’t create a ShopLuxe account, you can safely ignore this email.</p>
                `,
      });
    } catch (emailErr: any) {
      await User.deleteOne({ _id: user._id });
      return NextResponse.json({ success: false, message: safeErrorMessage(emailErr) }, { status: 500 });
    }

    user.lastOtpSentAt = new Date();
    await user.save();

    return NextResponse.json(
      { success: true, message: "Registered, check email for OTP" },
      { status: 201 }
    );
  } catch (error: any) {
    const zodErrors = handleZodError(error);

    if (zodErrors) {
      return NextResponse.json({ success: false, errors: zodErrors }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function login(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const data = loginSchema.parse(body);
    const email = normalizeEmail(data.email);
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ message: "invalid credentials" }, { status: 400 });
    if (user.isDeleted) return NextResponse.json({ message: "user is removed" }, { status: 400 });

    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) return NextResponse.json({ message: "invalid credentials" }, { status: 400 });
    if (!user.emailVerified) return NextResponse.json({ message: "email not verified" }, { status: 403 });

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    user.refreshTokens.push({ token: refreshToken });
    user.lastSignedIn = new Date();
    user.isOnline = true;
    await user.save();

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });

    response.cookies.set({ name: "accessToken", value: accessToken, ...buildCookieOptions(1 * 60 * 60 * 1000) });
    response.cookies.set({ name: "refreshToken", value: refreshToken, ...buildCookieOptions(7 * 24 * 60 * 60 * 1000) });

    return response;
  } catch (error: any) {
    const zodErrors = handleZodError(error);
    if (zodErrors) {
      return NextResponse.json({ success: false, errors: zodErrors }, { status: 400 });
    }
    return NextResponse.json({ message: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function refresh(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const currRefreshToken = request.cookies.get("refreshToken")?.value || body?.refreshToken;
    if (!currRefreshToken) return NextResponse.json({ message: "no refresh token" }, { status: 401 });

    const decoded: any = verifyRefreshToken(currRefreshToken);
    const newRefreshToken = signRefreshToken({ id: decoded.id });

    const user = await User.findOneAndUpdate(
      {
        _id: decoded.id,
        "refreshTokens.token": currRefreshToken,
        "refreshTokens.revoked": false,
      },
      {
        $set: { "refreshTokens.$.revoked": true },
        $push: { refreshTokens: { token: newRefreshToken, revoked: false, createdAt: new Date() } },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ message: "refresh tokens revoked ,reused or invalid " }, { status: 401 });
    }

    user.isOnline = true;
    await user.save();

    const newAccessToken = signAccessToken({ id: user._id, role: user.role });

    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });

    response.cookies.set({ name: "accessToken", value: newAccessToken, ...buildCookieOptions(15 * 60 * 1000) });
    response.cookies.set({ name: "refreshToken", value: newRefreshToken, ...buildCookieOptions(7 * 24 * 60 * 60 * 1000) });

    return response;
  } catch {
    return NextResponse.json({ message: "invalid or expired token" }, { status: 401 });
  }
}

export async function logout(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const currRefreshToken = request.cookies.get("refreshToken")?.value || body?.refreshToken;
    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    let user: any = null;

    if (currRefreshToken) {
      try {
        const decoded: any = verifyRefreshToken(currRefreshToken);
        user = await User.findById(decoded.id);
      } catch {
        // ignore invalid refresh token
      }
    }

    if (!user && bearerToken) {
      try {
        const decodedAccess: any = verifyAccessToken(bearerToken);
        user = await User.findById(decodedAccess.id);
      } catch {
        // ignore invalid access token
      }
    }

    if (user) {
      if (currRefreshToken) {
        user.refreshTokens = user.refreshTokens.map((rt: any) =>
          rt.token === currRefreshToken ? { ...rt.toObject(), revoked: true } : rt
        );
      }
      user.isOnline = false;
      user.lastLoggedOutAt = new Date();
      await user.save();
    }

    const response = NextResponse.json({ message: "logged out" });
    response.cookies.set({ name: "accessToken", value: "", expires: new Date(0), ...buildCookieOptions() });
    response.cookies.set({ name: "refreshToken", value: "", expires: new Date(0), ...buildCookieOptions() });

    return response;
  } catch {
    return NextResponse.json({ message: "log out failed" }, { status: 500 });
  }
}

export async function verifyOtp(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const otp = String(body?.otp || "").trim();
    const user = await User.findOne({ email });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
      return NextResponse.json({ message: "Too many attempts. Try again later." }, { status: 429 });
    }

    if (!user.otp || user.otp !== otp) {
      user.otpAttempts += 1;

      if (user.otpAttempts >= 5) {
        user.otpBlockedUntil = Date.now() + 1000 * 60 * 15;
      }

      await user.save();
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    if (user.otpExpires < Date.now()) {
      return NextResponse.json({ message: "OTP expired" }, { status: 400 });
    }

    user.emailVerified = true;
    user.otp = undefined as any;
    user.otpExpires = undefined as any;
    user.otpAttempts = 0;
    user.otpBlockedUntil = undefined as any;

    await user.save();
    await sendEmail({
      to: user.email,
      subject: "Welcome to ShopLuxe",
      title: "Welcome to ShopLuxe",
      preheader: "Your account is fully verified.",
      htmlContent: `
                <h1>Welcome, ${user.name.split(" ")[0]}!</h1>
                <p>Your email is verified and your account is ready.</p>
                <div class="card">
                  <p><strong>What's next?</strong></p>
                  <ul class="list">
                    <li>Explore curated collections.</li>
                    <li>Save items to your wishlist.</li>
                    <li>Track orders in real time.</li>
                  </ul>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/products" class="button">Start Shopping</a>
                </div>
                <p class="muted">Need help? Reply to this email and our support team will assist.</p>
            `,
    });

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Invalid OTP" }, { status: 400 });
  }
}

export async function resendOtp(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const user = await User.findOne({ email });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" }, { status: 400 });
    }

    if (user.lastOtpSentAt && Date.now() - user.lastOtpSentAt.getTime() < 60 * 1000) {
      const elapsed = Date.now() - user.lastOtpSentAt.getTime();
      const retryAfterSeconds = Math.max(1, Math.ceil((60 * 1000 - elapsed) / 1000));
      return NextResponse.json(
        { message: "Please wait before requesting another OTP", retryAfterSeconds },
        { status: 429 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 1000 * 60 * 10;
    user.otpAttempts = 0;

    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Your new verification code",
        title: "New OTP Code",
        preheader: "Here is your new verification code.",
        htmlContent: `
                  <h1>Your new verification code</h1>
                  <p>Hello ${user.name.split(" ")[0]},</p>
                  <p>Use the code below to verify your email address.</p>
                  <div class="otp-box">
                    <p class="otp-code">${otp}</p>
                  </div>
                  <div class="card">
                    <p class="muted">For your security:</p>
                    <ul class="list">
                      <li>Do not share this code with anyone.</li>
                      <li>This code expires in 10 minutes.</li>
                    </ul>
                  </div>
                `,
      });
    } catch (emailErr: any) {
      return NextResponse.json({ message: safeErrorMessage(emailErr) }, { status: 500 });
    }

    user.lastOtpSentAt = new Date();
    await user.save();

    return NextResponse.json({ message: "OTP resent successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function forgotPassword(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    if (!email || email.trim() === "") {
      return NextResponse.json({ message: "Email field is required" }, { status: 400 });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "If email exists, reset link sent" });
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
      request.headers.get("origin") ||
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

    return NextResponse.json({ message: "Password reset email sent" });
  } catch {
    return NextResponse.json({ message: "Error sending reset email" }, { status: 500 });
  }
}

export async function resetPassword(request: NextRequest, token: string) {
  await connectDB();

  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body || {};

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined as any;
    user.resetTokenExpires = undefined as any;

    await user.save();

    return NextResponse.json({ message: "Password reset successful" });
  } catch {
    return NextResponse.json({ message: "Reset failed" }, { status: 500 });
  }
}
