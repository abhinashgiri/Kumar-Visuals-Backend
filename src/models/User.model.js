import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, models, model } = mongoose;

/* ===============================
   USER SCHEMA
================================ */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    avatarUrl: {
      type: String,
      trim: true,
    },

    roles: {
      type: [String],
      enum: ["user", "admin"],
      default: ["user"],
    },

    /* ===============================
       PURCHASED PRODUCTS
    ================================ */
    purchasedProducts: {
      type: [
        {
          product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          purchasedAt: { type: Date, default: Date.now },
          source: { type: String, default: "order" },
        },
      ],
      default: [], // Yeh line zaroori hai
    },
    /* ===============================
       MEMBERSHIP
    ================================ */
    membership: {
      planKey: {
        type: String,
        default: null,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: ["NONE", "ACTIVE", "EXPIRED", "CANCELLED"],
        default: "NONE",
      },
    },

    membershipUsage: {
      periodStart: {
        type: Date,
        default: null,
      },
      downloadsUsed: {
        type: Number,
        default: 0,
      },
      remixRequestsUsed: {
        type: Number,
        default: 0,
      },
    },

    /* ===============================
       AUTH / SECURITY
    ================================ */
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },

    isBanned: {
      type: Boolean,
      default: false,
      select: false,
    },

    /* ===============================
       SOFT DELETE
    ================================ */
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

/* ===============================
   PASSWORD HASH
================================ */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    // avoid double-hashing
    if (typeof this.password === "string" && this.password.startsWith("$2")) {
      return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* ===============================
   METHODS
================================ */
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

/* ===============================
   SAFE JSON OUTPUT
================================ */
userSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.refreshTokenHash;
  delete user.failedLoginAttempts;
  delete user.lockUntil;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.isBanned;
  delete user.isDeleted;
  delete user.deletedAt;

  return user;
};

const User = models.User || model("User", userSchema);
export default User;
