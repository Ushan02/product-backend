import Users from "../models/Users.js";

export const CUSTOMER_ID_MSG =
  "Customer ID must be 12 numbers, or 11 numbers ending with V (e.g. 200205202165 or 12345678901V).";

const TWELVE_DIGITS_REGEX = /^\d{12}$/;
const ELEVEN_DIGITS_V_REGEX = /^\d{11}V$/;

export function normalizeCustomerId(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/[vV]$/.test(trimmed)) {
    return `${trimmed.slice(0, -1)}V`;
  }
  return trimmed;
}

export function isValidCustomerId(value) {
  const normalized = normalizeCustomerId(value);
  if (!normalized) return false;
  if (TWELVE_DIGITS_REGEX.test(normalized)) return true;
  return ELEVEN_DIGITS_V_REGEX.test(normalized);
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
    const candidate = randomDigits(12);
    const exists = await Users.exists({ customerId: candidate });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate unique customer ID.");
}
