import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.model.js";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
} from "../utils/jwt.js";

/* -------------------- CONFIG -------------------- */

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REFRESH_COOKIE_NAME = "refreshToken";
const isProd = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

/* -------------------- HELPERS -------------------- */

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

function createNewGoogleUser({ email, name, picture }) {
  return new User({
    name: name || "Unnamed User",
    email,
    password: crypto.randomBytes(20).toString("hex"),
    avatarUrl: picture || undefined,
    roles: ["user"],
    purchasedProducts: [],
    membership: {
      status: "NONE",
      planKey: null,
      startedAt: null,
      expiresAt: null,
    },
    membershipUsage: {
      periodStart: new Date(),
      downloadsUsed: 0,
      remixRequestsUsed: 0,
    },
  });
}

function normalizeLegacyUserData(user) {
  const hasValidPurchasedProducts =
    Array.isArray(user.purchasedProducts) &&
    (user.purchasedProducts.length === 0 ||
      (typeof user.purchasedProducts[0] === "object" &&
        user.purchasedProducts[0]?.product));

  if (!hasValidPurchasedProducts) {
    user.purchasedProducts = [];
  }

  if (!user.membership) {
    user.membership = {
      status: "NONE",
      planKey: null,
      startedAt: null,
      expiresAt: null,
    };
  }

  if (!user.membershipUsage) {
    user.membershipUsage = {
      periodStart: new Date(),
      downloadsUsed: 0,
      remixRequestsUsed: 0,
    };
  }
}


/* -------------------- CONTROLLER -------------------- */

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "No token provided" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const { email, name, picture } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail }).select(
      "+refreshTokenHash +isBanned +isDeleted +lockUntil +roles +failedLoginAttempts"
    );

    if (user?.isDeleted) {
      return res.status(403).json({ message: "Account deleted" });
    }

    if (user?.isBanned) {
      return res.status(403).json({ message: "User is banned" });
    }

    if (user?.isLocked?.()) {
      return res.status(423).json({
        message: "Account locked",
        lockUntil: user.lockUntil,
      });
    }

    if (user === null) {
      user = createNewGoogleUser({
        email: normalizedEmail,
        name,
        picture,
      });
    } else {
      normalizeLegacyUserData(user);
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashToken(refreshToken);

    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      accessToken,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err?.message || err);
    return res.status(500).json({
      message: "Google login failed",
      error: err.message,
    });
  }
};

