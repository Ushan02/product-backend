export function getPaymentSettings() {
  const mode = (process.env.PAYMENT_MODE || "free").toLowerCase() === "stripe" ? "stripe" : "free";

  return {
    mode,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    frontendUrl: (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""),
  };
}

export function isStripeEnabled() {
  const settings = getPaymentSettings();
  return settings.mode === "stripe" && Boolean(settings.stripeSecretKey);
}
