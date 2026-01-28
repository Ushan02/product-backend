import Review from "../models/review.js";
import Order from "../models/order.js"; 


export const addReview = async (req, res) => {
  try {
    
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

    const { rating, comment } = req.body;
    const email = req.user.email;


    if (!rating || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }

    
    const hasOrdered = await Order.exists({ userEmail: email });
    if (hasOrdered) {
      return res.status(403).json({ message: "Only users who ordered services can leave a review" });
    }

    const review = new Review({
      email,
      rating,
      comment
    });

    await review.save();

    res.status(201).json({
      message: "Review added successfully",
      review
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You already added a review" });
    }
    res.status(500).json({ message: error.message });
  }
};


export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
