function isWholeNumber(value) {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function parseNonNegativeInt(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return Number(trimmed);
  }

  if (!isWholeNumber(value) || value < 0) return null;
  return value;
}

export function parsePositiveInt(value) {
  const qty = parseNonNegativeInt(value);
  if (qty === null || qty < 1) return null;
  return qty;
}
