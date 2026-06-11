import express from "express";
import {
  addReview,
  getReviews,
  getUnreadReviewCount,
  markAllReviewsRead,
  deleteReview,
} from "../Controller/reviewCont.js";

const reviewrouter = express.Router();

reviewrouter.get("/unread-count", getUnreadReviewCount);
reviewrouter.patch("/mark-all-read", markAllReviewsRead);
reviewrouter.get("/", getReviews);
reviewrouter.post("/", addReview);
reviewrouter.delete("/:id", deleteReview);

export default reviewrouter;
