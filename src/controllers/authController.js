import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.model.js";
import PendingUser from "../models/PendingUser.model.js";
import EmailTemplate from "../models/EmailTemplate.model.js";
import SiteSettings from "../models/SiteSettings.model.js";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { createResetPasswordToken } from "../utils/createResetToken.js";
import { sendEmail } from "../utils/mailer.js";
import {
  buildVerificationEmailHtml,
  resetPasswordTemplate,
} from "../templates/emailTemplates.js";

/* =========================================================
   CONSTANTS
========================================================= */

const isProd = process.env.NODE_ENV === "production";
const REFRESH_COOKIE_NAME = "refreshToken";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

/* =========================================================
   HELPERS
========================================================= */

/**
 * Generates access & refresh tokens for a user
 */
function generateTokens(user) {
  const accessToken = signAccessToken({
    id: user._id.toString(),
    roles: user.roles,
  });

  const refreshToken = signRefreshToken({
    id: user._id.toString(),
  });

  return { accessToken, refreshToken };
}

/**
 * Generates 6-digit OTP
 */
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Simple variable replacement for email templates
 */
function renderTemplate(template, variables = {}) {
  if (!template) return "";
  return template.replaceAll(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const val = variables[key] ?? variables[key.toUpperCase()] ?? "";
    return val == null ? "" : String(val);
  });
}

/**
 * Fetches active email template safely
 */
async function getActiveTemplate(key) {
  if (!key) return null;
  const tpl = await EmailTemplate.findOne({ key }).lean();
  return tpl && tpl.isActive !== false ? tpl : null;
}


function sendEmailSafely(payload) {
  setImmediate(async () => {
    try {
      await sendEmail(payload);
    } catch (err) {
      console.error("[MAILER] send failed:", err);
    }
  });
}

/* =========================================================
   REGISTER START
========================================================= */

export const registerStart = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSingleton();
    if (!settings.allowSignup) {
      return res.status(403).json({ message: "Signup is disabled at the moment." });
    }

    const { name, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email and password required" });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      isDeleted: { $ne: true },
    }).select("_id");

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const otp = generateOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const passwordHash = await bcrypt.hash(password, 12);

    await PendingUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name,
        passwordHash,
        roles: ["user"],
        emailVerificationOtp: otp,
        emailVerificationExpires: expires,
      },
      { upsert: true, new: true }
    );

    const appUrl = process.env.CLIENT_URL || "http://localhost:8080";
    let subject = "Verify your Kumar Music account";
    let html = buildVerificationEmailHtml(otp, appUrl);

    try {
      const template = await getActiveTemplate("VERIFY_EMAIL");
      if (template) {
        const vars = { NAME: name, EMAIL: normalizedEmail, OTP: otp, APP_URL: appUrl };
        subject = renderTemplate(template.subjectTemplate, vars);
        html = renderTemplate(template.bodyHtml, vars);
      }
    } catch (err) {
      console.error("[EMAIL TEMPLATE] VERIFY_EMAIL error:", err);
    }

    sendEmailSafely({ to: normalizedEmail, subject, html });

    return res.json({
      message: "Verification code sent to your email.",
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   VERIFY EMAIL
========================================================= */

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const pending = await PendingUser.findOne({ email: normalizedEmail }).select(
      "+emailVerificationOtp +emailVerificationExpires +passwordHash"
    );

    if (!pending) {
      return res.status(400).json({ message: "No pending registration found" });
    }

    if (pending.emailVerificationExpires < new Date()) {
      await PendingUser.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: "Verification code expired" });
    }

    if (String(pending.emailVerificationOtp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      roles: ["user"],
      password: pending.passwordHash,
      purchasedProducts: [],
      membership: { planKey: null, status: "NONE", startedAt: null, expiresAt: null },
      membershipUsage: { periodStart: new Date(), downloadsUsed: 0, remixRequestsUsed: 0 },
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashToken(refreshToken);

    await user.save();
    await PendingUser.deleteOne({ _id: pending._id });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({ accessToken, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   LOGIN
========================================================= */

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +failedLoginAttempts +lockUntil +isBanned +isDeleted"
    );

    if (!user || user.isDeleted) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account is banned by Admin" });
    }

    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({
        message: "Account Locked. Try again later.",
        lockUntil: user.lockUntil,
      });
    }

    if (req.query.admin === "true" && !user.roles.includes("admin")) {
      return res.status(403).json({ message: "Admin access only" });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({ accessToken, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   REFRESH TOKEN
========================================================= */

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
    if (!token) return res.status(401).json({ message: "Session expired" });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      return res.status(401).json({ message: "Invalid session" });
    }

    const user = await User.findById(payload.id).select(
      "+refreshTokenHash +roles +isDeleted +isBanned"
    );

    if (!user || user.isDeleted || user.isBanned || hashToken(token) !== user.refreshTokenHash) {
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      return res.status(401).json({ message: "Invalid or revoked session" });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({ accessToken });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    next(err);
  }
};

/* =========================================================
   LOGOUT
========================================================= */

export const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      return res.json({ message: "Already logged out", forceLogout: true });
    }

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        if (payload?.id === userId) {
          await User.findByIdAndUpdate(userId, {
            $unset: { refreshTokenHash: "" },
          });
        }
      } catch {
        // ignore invalid token
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

    return res.json({
      message: "Logged out successfully",
      forceLogout: true,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export const forgotPassword = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const user = await User.findOne({ email, isDeleted: { $ne: true } });

    if (!user) return res.status(400).json({ message: "User not found" });

    const resetToken = createResetPasswordToken(user);
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    let subject = "Reset your password";
    let html = resetPasswordTemplate(resetUrl);

    const template = await getActiveTemplate("RESET_PASSWORD");
    if (template) {
      const vars = { NAME: user.name, RESET_URL: resetUrl };
      subject = renderTemplate(template.subjectTemplate, vars);
      html = renderTemplate(template.bodyHtml, vars);
    }

    sendEmailSafely({ to: user.email, subject, html });

    return res.json({ message: "Reset link sent to your email" });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   RESET PASSWORD
========================================================= */

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+isDeleted");

    if (!user || user.isDeleted) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokenHash = null; // invalidate all sessions

    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};
