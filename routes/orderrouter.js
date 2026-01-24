import express from "express";
import { createOrder } from "../Controller/orderCont.js";

const orderrouter = express.Router();
orderrouter.post("/",createOrder)

export default orderrouter;