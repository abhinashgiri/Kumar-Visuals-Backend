import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const pendingUserSchema = new mongoose.Schema(
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

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    roles: {
      type: [String],
      enum: ["user", "admin"],
      default: ["user"],
    },

    emailVerificationOtp: {
      type: String,
      required: true,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

pendingUserSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

const PendingUser =
  mongoose.models.PendingUser ||
  mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser;
