import express from "express";
import { createOrder, getOrders, updateOrderStatus } from "../Controller/orderCont.js";

const orderrouter = express.Router();
orderrouter.get("/", getOrders);
orderrouter.patch("/:orderId/status", updateOrderStatus);
orderrouter.post("/", createOrder);

export default orderrouter;