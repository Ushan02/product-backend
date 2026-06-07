import Product from "../models/product.js";
import { parsePositiveInt } from "./stockNumbers.js";

function getLineItems(orderOrLines) {
  if (Array.isArray(orderOrLines)) {
    return orderOrLines.map((line) => ({
      productId: line.productinfo?.productId || line.productId,
      quantity: parsePositiveInt(line.quantity) ?? 0,
      productName: line.productinfo?.productName || line.productName || line.productId,
    }));
  }
  return (orderOrLines.products || []).map((line) => ({
    productId: line.productinfo.productId,
    quantity: parsePositiveInt(line.quantity) ?? 0,
    productName: line.productinfo.productName,
  }));
}

export async function validateOrderStock(orderLines) {
  const lines = getLineItems(orderLines);
  const errors = [];

  for (const line of lines) {
    if (line.quantity < 1) {
      errors.push(`Invalid quantity for ${line.productId}.`);
      continue;
    }
    const product = await Product.findOne({ productId: line.productId });
    if (!product || !product.isAvailable) {
      errors.push(`${line.productName || line.productId} is unavailable.`);
      continue;
    }
    if (product.stock < line.quantity) {
      errors.push(
        `Not enough stock for ${product.productName}. Only ${product.stock} left.`
      );
    }
  }

  return errors;
}

export async function reduceProductStock(productId, quantity) {
  const qty = parsePositiveInt(quantity);
  if (qty === null) {
    throw new Error("Quantity must be a whole number of at least 1.");
  }

  const updated = await Product.findOneAndUpdate(
    { productId, stock: { $gte: qty }, isAvailable: true },
    { $inc: { stock: -qty } },
    { new: true }
  );

  if (!updated) {
    const product = await Product.findOne({ productId });
    if (!product) {
      throw new Error("Product not found.");
    }
    if (!product.isAvailable) {
      throw new Error(`${product.productName} is unavailable.`);
    }
    throw new Error(
      `Insufficient stock for ${product.productName}. Only ${product.stock} left.`
    );
  }

  return updated;
}

export async function restockProduct(productId, quantity) {
  const qty = parsePositiveInt(quantity);
  if (qty === null) {
    throw new Error("Restock quantity must be a whole number of at least 1.");
  }

  const updated = await Product.findOneAndUpdate(
    { productId },
    { $inc: { stock: qty } },
    { new: true }
  );

  if (!updated) {
    throw new Error("Product not found.");
  }

  return updated;
}

export async function deductOrderStock(order) {
  const lines = getLineItems(order);

  for (const line of lines) {
    await reduceProductStock(line.productId, line.quantity);
  }
}

export async function restoreOrderStock(order) {
  const lines = getLineItems(order);

  for (const line of lines) {
    await Product.findOneAndUpdate(
      { productId: line.productId },
      { $inc: { stock: line.quantity } }
    );
  }
}

export async function finalizeOrderStock(order) {
  if (order.stockDeducted) return order;

  const stockErrors = await validateOrderStock(order);
  if (stockErrors.length) {
    throw new Error(stockErrors[0]);
  }

  await deductOrderStock(order);
  order.stockDeducted = true;
  await order.save();
  return order;
}

export async function adjustProductStock(productId, delta) {
  const change = parsePositiveInt(Math.abs(delta));
  if (change === null || Number(delta) === 0) {
    throw new Error("Delta must be a non-zero whole number.");
  }
  const signedChange = Number(delta) < 0 ? -change : change;

  if (signedChange < 0) {
    return reduceProductStock(productId, Math.abs(signedChange));
  }

  return restockProduct(productId, signedChange);
}
