import Users from "../models/Users.js";

export const CUSTOMER_ID_REGEX = /^\d{10,11}V$/;

export function normalizeCustomerId(value) {
  if (!value) return "";
  let trimmed = String(value).trim();
  if (/[vV]$/.test(trimmed)) {
    trimmed = trimmed.slice(0, -1);
  }
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return `${digits}V`;
}

export function isValidCustomerId(value) {
  const normalized = normalizeCustomerId(value);
  if (!CUSTOMER_ID_REGEX.test(normalized)) return false;
  const digits = normalized.slice(0, -1);
  return digits.length === 10 || digits.length === 11;
}

function randomDigits(count) {
  let digits = "";
  for (let i = 0; i < count; i += 1) {
    digits += Math.floor(Math.random() * 10);
  }
  if (digits[0] === "0") {
    digits = String(1 + Math.floor(Math.random() * 9)) + digits.slice(1);
  }
  return digits;
}

export async function generateUniqueCustomerId() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const length = Math.random() < 0.5 ? 10 : 11;
    const candidate = `${randomDigits(length)}V`;
    const exists = await Users.exists({ customerId: candidate });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate unique customer ID.");
}
