import express from "express";
import { getPaymentConfig, completeStripePayment } from "../Controller/paymentCont.js";

const paymentRouter = express.Router();

paymentRouter.get("/config", getPaymentConfig);
paymentRouter.get("/complete", completeStripePayment);

export default paymentRouter;
