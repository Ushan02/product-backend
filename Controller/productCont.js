import Product from "../models/product.js";
import { isAdmin } from "./userCont.js";

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
    const product = new Product(req.body);
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
    await Product.updateOne({ productId: req.params.productId }, req.body);
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