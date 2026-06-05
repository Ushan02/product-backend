import Product from "../models/product.js";
import { isAdmin } from "./userCont.js";

function normalizeStock(value) {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock < 0) {
    return null;
  }
  return Math.floor(stock);
}

export async function getProduct(req, res) {
  try {
    const product = isAdmin(req)
      ? await Product.find()
      : await Product.find({ isAvailable: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to get products", error: err.message });
  }
}

export async function saveProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "You are not allowed to add a product." });
  }

  try {
    const stock = normalizeStock(req.body.stock ?? 0);
    if (stock === null) {
      return res.status(400).json({ message: "Stock must be a non-negative number." });
    }

    const product = new Product({ ...req.body, stock });
    await product.save();
    res.status(201).json({ message: "Product added successfully." });
  } catch (err) {
    // Show the actual error so you can debug easily
    console.error("Save product error:", err.message);
    res.status(500).json({ message: "Failed to add product.", error: err.message });
  }
}

export async function deleteProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "You are not allowed to delete a product." });
  }
  try {
    await Product.deleteOne({ productId: req.params.productId });
    res.json({ message: "Product deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product.", error: err.message });
  }
}

export async function updateProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "You are not allowed to update a product." });
  }
  try {
    const update = { ...req.body };

    if (update.stock !== undefined) {
      const stock = normalizeStock(update.stock);
      if (stock === null) {
        return res.status(400).json({ message: "Stock must be a non-negative number." });
      }
      update.stock = stock;
    }

    await Product.updateOne({ productId: req.params.productId }, update);
    res.json({ message: "Product updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product.", error: err.message });
  }
}

export async function getProductById(req, res) {
  try {
    const product = await Product.findOne({ productId: req.params.productId });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (!product.isAvailable && !isAdmin(req)) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Internal server error.", error: err.message });
  }
}