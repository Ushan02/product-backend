import express from "express";
import { addReview, getReviews, deleteReview } from "../Controller/reviewCont.js";

const reviewrouter = express.Router();

reviewrouter.get("/", getReviews);
reviewrouter.post("/", addReview);
reviewrouter.delete("/:id", deleteReview);

export default reviewrouter;
