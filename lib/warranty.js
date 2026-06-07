export const LAPTOP_WARRANTY = "1 Year";
export const ACCESSORY_WARRANTY = "6 months";

export function getDefaultWarranty(category) {
  return category === "laptop" ? LAPTOP_WARRANTY : ACCESSORY_WARRANTY;
}

export function resolveWarranty(category, warranty) {
  const trimmed = String(warranty ?? "").trim();
  return trimmed || getDefaultWarranty(category);
}

export function attachWarranty(product) {
  const obj = product?.toObject ? product.toObject() : { ...product };
  return {
    ...obj,
    warranty: resolveWarranty(obj.category, obj.warranty),
  };
}
