import { getDefaultWarranty } from "./warranty.js";

const STORE_NAME = process.env.STORE_NAME || "TechZone";
const STORE_EMAIL = process.env.STORE_EMAIL || process.env.SMTP_FROM || "support@myapp.lk";
const STORE_PHONE = process.env.STORE_PHONE || "+94 11 000 0000";
const STORE_ADDRESS =
  process.env.STORE_ADDRESS || "123 Tech Street, Colombo 03, Sri Lanka";

export function formatBillPrice(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "RS 0.00";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `RS ${formatted}`;
}

export function getLineWarranty(line) {
  const info = line.productinfo || {};
  if (info.warranty?.trim()) return info.warranty.trim();
  if (info.category) return getDefaultWarranty(info.category);
  const id = String(info.productId || "").toUpperCase();
  if (id.startsWith("LAP")) return getDefaultWarranty("laptop");
  if (id.startsWith("ACC")) return getDefaultWarranty("accessories");
  return "—";
}

function paymentMethodLabel(method) {
  if (method === "split") return "Cash + Card";
  if (method === "card" || method === "stripe") return "Card";
  return "Cash";
}

function paymentStatusLabel(status) {
  const labels = {
    paid: "Payment successful",
    partial_paid: "Partially paid",
    pending_cod: "Cash — pending",
    pending_pos: "Card — pending",
    awaiting_payment: "Awaiting payment",
    failed: "Payment failed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function formatBillDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("en-LK", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildLineRows(order) {
  return (order.products || [])
    .map((line) => {
      const info = line.productinfo || {};
      const unit = Number(info.price ?? 0);
      const qty = Number(line.quantity ?? 0);
      const warranty = getLineWarranty(line);
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a">${info.productName || "—"}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;color:#64748b">${info.productId || "—"}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#0077b6;font-weight:600">${warranty}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${qty}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatBillPrice(unit)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${formatBillPrice(unit * qty)}</td>
        </tr>`;
    })
    .join("");
}

function buildPaymentBreakdown(order) {
  if (order.paymentMethod !== "split") return "";
  return `
    <div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Payment breakdown</p>
      <p style="margin:4px 0;font-size:14px;color:#0f172a">Cash (${order.cashPercent ?? 0}%): <strong>${formatBillPrice(order.cashAmount ?? 0)}</strong></p>
      <p style="margin:4px 0;font-size:14px;color:#0f172a">Card (${order.cardPercent ?? 0}%): <strong>${formatBillPrice(order.cardAmount ?? 0)}</strong></p>
    </div>`;
}

export function buildOrderBillHtml(order) {
  const labelTotal = Number(order.labelTotal);
  const showLabelTotal = Number.isFinite(labelTotal) && labelTotal !== order.total;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice ${order.orderId}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#03045e,#0077b6);border-radius:12px 12px 0 0;padding:28px 24px;color:#fff">
      <p style="margin:0;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:0.85">Invoice</p>
      <h1 style="margin:8px 0 0;font-size:28px;font-weight:800">${STORE_NAME}</h1>
      <p style="margin:12px 0 0;font-size:14px;opacity:0.9">Thank you for your purchase</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="vertical-align:top;width:50%">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase">Bill to</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a">${order.name}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#475569">${order.email}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#475569">Tel: ${order.phone ?? "—"}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#475569;line-height:1.5">${order.address}</p>
          </td>
          <td style="vertical-align:top;text-align:right">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase">Order</p>
            <p style="margin:0;font-family:monospace;font-size:16px;font-weight:700;color:#0077b6">${order.orderId}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#475569">${formatBillDate(order.date)}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#475569">Payment: ${paymentMethodLabel(order.paymentMethod)}</p>
            <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#059669">${paymentStatusLabel(order.paymentStatus)}</p>
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Product</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">ID</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Warranty</th>
            <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Qty</th>
            <th style="padding:10px 8px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Unit</th>
            <th style="padding:10px 8px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Total</th>
          </tr>
        </thead>
        <tbody>${buildLineRows(order)}</tbody>
      </table>
      ${buildPaymentBreakdown(order)}
      <div style="margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;text-align:right">
        <p style="margin:0;font-size:14px;color:#64748b">Order total</p>
        <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#03045e">${formatBillPrice(order.total)}</p>
        ${
          showLabelTotal
            ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;text-decoration:line-through">Labeled: ${formatBillPrice(labelTotal)}</p>`
            : ""
        }
      </div>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center">
        <p style="margin:0;font-size:12px;color:#64748b">${STORE_ADDRESS}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b">${STORE_EMAIL} · ${STORE_PHONE}</p>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8">This is a computer-generated invoice from ${STORE_NAME}.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildOrderBillText(order) {
  const lines = [
    `${STORE_NAME} — Invoice`,
    `Order: ${order.orderId}`,
    `Date: ${formatBillDate(order.date)}`,
    `Customer: ${order.name} <${order.email}>`,
    `Phone: ${order.phone ?? "—"}`,
    `Address: ${order.address}`,
    `Payment: ${paymentMethodLabel(order.paymentMethod)} — ${paymentStatusLabel(order.paymentStatus)}`,
    "",
    "Items:",
  ];

  for (const line of order.products || []) {
    const info = line.productinfo || {};
    const unit = Number(info.price ?? 0);
    const qty = Number(line.quantity ?? 0);
    lines.push(
      `- ${info.productName} (${info.productId}) x${qty} @ ${formatBillPrice(unit)} = ${formatBillPrice(unit * qty)} | Warranty: ${getLineWarranty(line)}`
    );
  }

  lines.push("", `Total: ${formatBillPrice(order.total)}`, "", `${STORE_EMAIL} · ${STORE_PHONE}`);
  return lines.join("\n");
}
