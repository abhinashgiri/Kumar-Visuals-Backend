// services/refund.service.js
import Razorpay from "razorpay";
import Order from "../models/Order.model.js";

/* --------------------------------------------------
   RAZORPAY CLIENT (SAFE INIT)
-------------------------------------------------- */
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay keys are not configured");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* --------------------------------------------------
   INITIATE REFUND (IDEMPOTENT & SAFE)
-------------------------------------------------- */
export const initiateRefund = async (order) => {
  if (!order || !order.paymentId) {
    throw new Error("Invalid order or missing paymentId");
  }

  // Strict gate
  if (order.status !== "PAID") {
    throw new Error(`Refund not allowed. Current status: ${order.status}`);
  }

  /* ------------------------------------------
     PRE-LOCK ORDER (ANTI DOUBLE-REFUND)
  ------------------------------------------ */
  const locked = await Order.findOneAndUpdate(
    { _id: order._id, status: "PAID" },
    {
      $set: {
        status: "REFUND_INITIATED",
        "paymentRaw.refundInitiatedAt": new Date(),
      },
    },
    { new: true }
  );

  if (!locked) {
    throw new Error("Refund already in progress or completed");
  }

  try {
    const refund = await razorpay.payments.refund(locked.paymentId, {
      amount: Math.round(locked.total * 100),
      speed: "optimum",
    });

    locked.paymentRaw = {
      ...locked.paymentRaw,
      refundRequest: refund,
    };

    await locked.save();
    return refund;
  } catch (err) {
    console.error("Refund API failed:", err);

    // Rollback state only if API failed
    await Order.updateOne(
      { _id: locked._id },
      {
        $set: { status: "PAID" },
        $setOnInsert: {},
        $push: {
          "paymentRaw.refundErrors": {
            message: err.message,
            at: new Date(),
          },
        },
      }
    );

    throw err;
  }
};
