import Users from "../models/Users.js";

export const CUSTOMER_ID_REGEX = /^\d{10,11}V$/;

export function normalizeCustomerId(value) {
  if (!value) return "";
  const trimmed = String(value).trim().toUpperCase();
  if (!trimmed) return "";
  return trimmed.endsWith("V") ? trimmed : `${trimmed}V`;
}

export function isValidCustomerId(value) {
  return CUSTOMER_ID_REGEX.test(normalizeCustomerId(value));
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
