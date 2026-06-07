import Stripe from "stripe";
import { getPaymentSettings } from "./paymentConfig.js";

let stripeInstance = null;

export function getStripe() {
  const { stripeSecretKey } = getPaymentSettings();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(stripeSecretKey);
  }
  return stripeInstance;
}
