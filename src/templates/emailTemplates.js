// src/templates/emailTemplates.js

export function buildVerificationEmailHtml(otp, appUrl) {
  return `
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  background: #f5f7ff;
  padding: 40px 0;
  text-align: center;
">
  <div style="
    max-width: 640px;
    margin: 0 auto;
    background: #ffffff;
    padding: 40px 36px 32px;
    border-radius: 32px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
    box-sizing: border-box;
  ">

    <div style="margin-bottom: 16px;">
      <div style="
        width: 80px;
        height: 80px;
        border-radius: 9999px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        margin: 0 auto;
        display: block;
      ">
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 9999px;
          line-height: 80px;
          text-align: center;
        ">
          <span style="
            font-size: 36px;
            color: #ffffff;
            display:inline-block;
          ">
            &#9835;
          </span>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <div style="
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 2px;
      ">
        Kumar Music
      </div>
      <div style="
        font-size: 14px;
        color: #6b7280;
      ">
        Email verification
      </div>
    </div>

    <h1 style="
      color: #111827;
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 16px;
    ">
      Verify your email
    </h1>

    <p style="
      color: #4b5563;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 28px;
    ">
      Use the verification code below to complete your
      <strong>Kumar Music</strong> account sign up.
    </p>

    <div style="
      width: 100%;
      border-radius: 9999px;
      background: linear-gradient(135deg, #f5f3ff, #eef2ff);
      padding: 24px 32px;
      box-sizing: border-box;
      text-align: center;
      border: 1px solid #e5e7eb;
      margin: 0 auto 28px;
    ">
      <div style="
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 10px;
      ">
        Your verification code
      </div>
      <div style="
        font-size: 32px;
        letter-spacing: 0.35em;
        font-weight: 700;
        color: #4c1d95;
      ">
        ${otp}
      </div>
    </div>

    <p style="
      color: #6b7280;
      font-size: 12px;
      margin: 0 0 14px;
    ">
      This code will expire in <strong>15 minutes</strong>.
    </p>

    <p style="
      color: #9ca3af;
      font-size: 12px;
      margin: 22px 0 12px;
    ">
      If you didn’t try to create a Kumar Music account, you can safely ignore this email.
    </p>

    <hr style="
      margin: 24px 0 14px;
      border: 0;
      border-top: 1px solid #e5e7eb;
    ">

    <p style="
      color: #9ca3af;
      font-size: 11px;
      margin: 0;
    ">
      Sent from <strong>Kumar Music</strong>. Please don’t reply to this automated email.
    </p>

  </div>
</div>
`;
}

export const resetPasswordTemplate = (resetUrl) => {
  return `
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  background: #f5f7fb;
  padding: 40px 0;
  text-align: center;
">
  <div style="
    max-width: 480px;
    margin: auto;
    background: #ffffff;
    padding: 32px 24px;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  ">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
  <tr>
    <td align="center">
      <div style="
        width: 80px;
        height: 80px;
        border-radius: 9999px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        display: block;
        margin: 0 auto;
      ">
        <div style="
          width: 80px;
          height: 80px;
          border-radius:9999px;
          line-height: 80px;
          text-align:center;
        ">
          <span style="
            font-size:36px;
            color:#ffffff;
            display:inline-block;
          ">
            &#9835;
          </span>
        </div>
      </div>
    </td>
  </tr>
</table>

    <h2 style="
      color:#111827;
      font-size:24px;
      font-weight:700;
      margin: 0 0 8px;
    ">
      Reset your password
    </h2>

    <p style="
      color:#6b7280;
      font-size:14px;
      line-height:1.6;
      margin: 0 0 20px;
    ">
      We received a request to reset the password for your
      <strong>Kumar Music</strong> account.
      Click the button below to choose a new password.
    </p>

    <a href="${resetUrl}" target="_blank" style="
      display:inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color:#ffffff;
      text-decoration:none;
      border-radius:9999px;
      font-size:15px;
      font-weight:600;
      margin: 8px 0 16px;
    ">
      Reset Password
    </a>

    <p style="
      color:#6b7280;
      font-size:12px;
      margin: 0 0 8px;
    ">
      This link will expire in <strong>15 minutes</strong>.
    </p>

    <p style="
      color:#9ca3af;
      font-size:12px;
      margin: 16px 0 4px;
    ">
      If the button doesn’t work, copy and paste this URL into your browser:
    </p>

    <div style="
      word-break: break-all;
      background:#f3f4f6;
      padding:10px 12px;
      border-radius:8px;
      font-size:11px;
      color:#374151;
      text-align:left;
    ">
      ${resetUrl}
    </div>

    <hr style="
      margin: 24px 0;
      border: 0;
      border-top: 1px solid #e5e7eb;
    ">

    <p style="
      color:#9ca3af;
      font-size:11px;
      line-height:1.5;
      margin: 0;
    ">
      If you didn’t request this, you can safely ignore this email.
      Your password will stay the same.
    </p>

  </div>

  <p style="
    color:#9ca3af;
    font-size:11px;
    margin-top:16px;
  ">
    © ${new Date().getFullYear()} Kumar Music · All rights reserved
  </p>
</div>
`;
};

/* ========================= ORDER COMPLETE ========================= */

export function buildOrderCompleteSubject(vars = {}) {
  const code =
    vars.ORDER_CODE ||
    vars.orderCode ||
    (vars.ORDER_ID || vars.orderId || "").toString().toUpperCase();

  return `Your Kumar Music order ${code || ""} is complete`;
}

export function buildOrderCompleteEmailHtml(vars = {}) {
  const isMembership =
    !!vars.MEMBERSHIP_PLAN_KEY ||
    !!vars.membershipPlanKey ||
    !!vars.MEMBERSHIP_PLAN ||
    !!vars.membershipPlan;

  const customerName =
    vars.CUSTOMER_NAME || vars.customerName || "Customer";

  const orderCode =
    vars.ORDER_CODE ||
    vars.orderCode ||
    (vars.ORDER_ID || vars.orderId || "").toString().toUpperCase() + "#";

  const currency = vars.ORDER_CURRENCY || vars.currency || "INR";
  const total = vars.ORDER_TOTAL || vars.total || "";
  const status = vars.ORDER_STATUS || vars.status || "PAID";

  const membershipPlan =
    vars.MEMBERSHIP_PLAN ||
    vars.membershipPlan ||
    vars.MEMBERSHIP_PLAN_KEY ||
    vars.membershipPlanKey ||
    "";

  const membershipMonths =
    vars.MEMBERSHIP_MONTHS || vars.membershipMonths || "";

  /* -------------------------------------------
     Extracted ternary → Independent statement
  ------------------------------------------- */
  const membershipDurationHtml = membershipMonths
    ? `
      <p style="margin:4px 0 0; font-size:13px; color:#4b5563;">
        <strong>Duration:</strong> ${membershipMonths} month(s)
      </p>
    `
    : "";

  return `
<div style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  background: #f5f7fb;
  padding: 40px 0;
  text-align: center;
">
  <div style="
    max-width: 640px;
    margin: 0 auto;
    background: #ffffff;
    padding: 32px 28px;
    border-radius: 24px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  ">

    <div style="margin-bottom: 20px;">
      <div style="
        width: 72px;
        height: 72px;
        border-radius: 9999px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        margin: 0 auto;
        display: block;
      ">
        <div style="
          width: 72px;
          height: 72px;
          border-radius: 9999px;
          line-height: 72px;
          text-align: center;
        ">
          <span style="
            font-size: 32px;
            color: #ffffff;
            display:inline-block;
          ">
            &#9835;
          </span>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <div style="
        font-size: 18px;
        font-weight: 700;
        color: #111827;
      ">
        Kumar Music
      </div>
      <div style="
        font-size: 13px;
        color: #6b7280;
      ">
        ${isMembership ? "Membership confirmation" : "Order confirmation"}
      </div>
    </div>

    <h1 style="
      color:#111827;
      font-size:24px;
      font-weight:700;
      margin: 0 0 12px;
    ">
      ${isMembership ? "Your membership is active" : "Thank you for your purchase"}
    </h1>

    <p style="
      color:#4b5563;
      font-size:14px;
      line-height:1.6;
      margin: 0 0 20px;
    ">
      Hi ${customerName},<br/>
      Your ${isMembership ? "membership order" : "order"} with <strong>Kumar Music</strong> has been completed.
    </p>

    <div style="
      background:#f9fafb;
      border-radius:16px;
      padding:16px 18px;
      text-align:left;
      border:1px solid #e5e7eb;
      margin-bottom:20px;
    ">
      <h2 style="
        font-size:15px;
        font-weight:600;
        color:#111827;
        margin: 0 0 10px;
      ">
        Order details
      </h2>

      <p style="margin:0; font-size:13px; color:#4b5563;">
        <strong>Order ID:</strong>
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
          ${orderCode}
        </span>
      </p>

      <p style="margin:4px 0 0; font-size:13px; color:#4b5563;">
        <strong>Status:</strong> ${status}
      </p>

      <p style="margin:4px 0 0; font-size:13px; color:#4b5563;">
        <strong>Total:</strong> ${currency} ${total}
      </p>

      ${
        vars.ORDER_DATE || vars.ORDER_CREATED_AT
          ? `
      <p style="margin:4px 0 0; font-size:13px; color:#4b5563;">
        <strong>Date:</strong> ${vars.ORDER_DATE || vars.ORDER_CREATED_AT}
      </p>
      `
          : ""
      }
    </div>

    ${
      isMembership
        ? `
    <div style="
      background:#eef2ff;
      border-radius:16px;
      padding:16px 18px;
      text-align:left;
      border:1px solid #e5e7eb;
      margin-bottom:20px;
    ">

      <h2 style="
        font-size:15px;
        font-weight:600;
        color:#111827;
        margin: 0 0 10px;
      ">
        Membership details
      </h2>

      <p style="margin:0; font-size:13px; color:#4b5563;">
        <strong>Plan:</strong> ${membershipPlan || "Membership"}
      </p>

      ${membershipDurationHtml}

    </div>
    `
        : ""
    }

    <p style="
      color:#6b7280;
      font-size:12px;
      margin: 4px 0 0;
    ">
      If you have any questions about your order, just reply to this email.
    </p>

    <hr style="
      margin: 24px 0 16px;
      border: 0;
      border-top: 1px solid #e5e7eb;
    ">

    <p style="
      color:#9ca3af;
      font-size:11px;
      margin: 0;
    ">
      Sent from <strong>Kumar Music</strong>.
    </p>

  </div>

  <p style="
    color:#9ca3af;
    font-size:11px;
    margin-top:16px;
  ">
    © ${new Date().getFullYear()} Kumar Music · All rights reserved
  </p>
</div>
`;
}
