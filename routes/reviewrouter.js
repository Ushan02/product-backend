import express from "express";
import { addReview, getReviews } from "../Controller/reviewCont.js";


const reviewrouter = express.Router();

reviewrouter.post("/",addReview);
reviewrouter.get("/", getReviews);

export default reviewrouter;
