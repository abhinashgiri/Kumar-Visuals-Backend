
import cron from "node-cron";
import mongoose from "mongoose";
import Order from "../models/Order.model.js";

/* =========================================================
   INTERNAL STATE (SAFETY)
========================================================= */

let isRunning = false;

/* =========================================================
   CORE JOB
========================================================= */

export const autoCancelPendingOrders = async () => {
  // 1️ DB connectivity guard
  if (mongoose.connection.readyState !== 1) {
    console.warn("[AUTO-CANCEL] Skipped: Database not connected.");
    return;
  }

  // 2️ Overlap guard (important for slow DB / network)
  if (isRunning) {
    console.warn("[AUTO-CANCEL] Skipped: Previous job still running.");
    return;
  }

  isRunning = true;

  try {
    const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60 * 1000);

    const result = await Order.updateMany(
      {
        status: "PENDING",
        createdAt: { $lte: TWO_MINUTES_AGO },
        paymentId: { $exists: false },
      },
      {
        $set: {
          status: "CANCELLED",
          cancelReason: "PAYMENT_TIMEOUT",
          completedAt: new Date(),
        },
      }
    );

    if (result?.modifiedCount > 0) {
      console.log(
        `[AUTO-CANCEL] ${result.modifiedCount} pending orders cancelled`
      );
    }
  } catch (err) {

    console.error("[AUTO-CANCEL] Failed:", err?.message || err);
  } finally {
    // 3️ Always release lock
    isRunning = false;
  }
};

/* =========================================================
   CRON SCHEDULER
========================================================= */


cron.schedule("*/2 * * * *", () => {
  autoCancelPendingOrders().catch((err) => {
    // Absolute last-resort guard
    console.error("[AUTO-CANCEL] Unhandled cron error:", err?.message || err);
  });
});
