import express from "express";

import {

  createOrder,

  getOrders,

  updateOrderStatus,

  cancelPendingOrder,

  markPaymentSuccessful,

} from "../Controller/orderCont.js";
import { createAdminOrder } from "../Controller/adminOrderCont.js";

const orderrouter = express.Router();

orderrouter.get("/", getOrders);
orderrouter.post("/admin", createAdminOrder);
orderrouter.post("/", createOrder);

orderrouter.post("/:orderId/cancel-pending", cancelPendingOrder);

orderrouter.patch("/:orderId/status", updateOrderStatus);

orderrouter.patch("/:orderId/payment-success", markPaymentSuccessful);



export default orderrouter;


