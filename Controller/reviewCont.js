import Review from "../models/review.js";
import Product from "../models/product.js";
import { isAdmin } from "./userCont.js";

export const addReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Login required to leave a review." });
    }

    const { productId, rating, comment } = req.body;
    const email = req.user.email;

    if (!productId?.trim() || !comment?.trim()) {
      return res.status(400).json({ message: "Product and review comment are required." });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Please select a star rating from 1 to 5." });
    }

    const product = await Product.findOne({ productId: productId.trim() });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const review = await Review.create({
      productId: productId.trim(),
      email,
      rating: Math.round(numericRating),
      comment: comment.trim(),
    });

    res.status(201).json({
      message: "Review added successfully.",
      review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You already reviewed this product." });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { productId } = req.query;

    if (productId) {
      const reviews = await Review.find({ productId: productId.trim() }).sort({ createdAt: -1 });
      const total = reviews.length;
      const average =
        total > 0
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
          : 0;
      return res.json({ reviews, total, average });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Admin access required." });
    }

    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadReviewCount = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }
  try {
    const count = await Review.countDocuments({ isRead: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllReviewsRead = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }
  try {
    await Review.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: "All reviews marked as read." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Review not found." });
    }
    res.json({ message: "Review deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
