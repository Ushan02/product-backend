import { computePaymentSplit } from "./paymentSplit.js";

const ADMIN_METHODS = ["cod", "card", "split"];

export function resolveAdminPaymentMethod(method) {
  const paymentMethod = method || "cod";
  if (!ADMIN_METHODS.includes(paymentMethod)) {
    return { error: "Payment method must be cash, card (POS), or cash + card." };
  }
  return { method: paymentMethod };
}

export function buildAdminPaymentPlan(paymentMethod, total, cashPercent, markPaid) {
  let cashPct = 100;
  let cardPct = 0;
  let cashAmount = total;
  let cardAmount = 0;
  let paymentStatus = "pending_cod";

  if (paymentMethod === "card") {
    cashPct = 0;
    cardPct = 100;
    cashAmount = 0;
    cardAmount = total;
    paymentStatus = markPaid ? "paid" : "pending_pos";
  } else if (paymentMethod === "split") {
    const split = computePaymentSplit(total, cashPercent);
    if (!split) return { error: "Cash percentage must be a whole number between 1 and 99." };
    cashPct = split.cashPercent;
    cardPct = split.cardPercent;
    cashAmount = split.cashAmount;
    cardAmount = split.cardAmount;
    if (markPaid) {
      paymentStatus = "paid";
    } else if (cardAmount > 0) {
      paymentStatus = "pending_pos";
    } else {
      paymentStatus = "pending_cod";
    }
  } else if (markPaid) {
    paymentStatus = "paid";
  }

  return { cashPct, cardPct, cashAmount, cardAmount, paymentStatus };
}

export function applyPosDetails(order, body, cardAmount) {
  const ref = String(body.posTransactionRef || "").trim();
  if (!ref) return;
  order.posTransactionRef = ref;
  order.posMachineId = String(body.posMachineId || "").trim() || null;
  order.posCardAmount = cardAmount;
  order.posNotes = String(body.posNotes || "").trim() || null;
  order.posConfirmedAt = new Date();
}
