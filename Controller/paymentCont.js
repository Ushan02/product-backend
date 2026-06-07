import Order from "../models/order.js";
import { getPaymentSettings, isStripeEnabled } from "../lib/paymentConfig.js";
import { getStripe } from "../lib/stripeClient.js";

export function getPaymentConfig(req, res) {
  const settings = getPaymentSettings();

  res.json({
    mode: settings.mode,
    stripePublishableKey:
      settings.mode === "stripe" ? settings.stripePublishableKey : null,
    methods:
      settings.mode === "free"
        ? [
            {
              id: "cod",
              label: "Cash on Delivery",
              description: "Pay with cash when your order is delivered.",
            },
          ]
        : [
            {
              id: "stripe",
              label: "Card Payment",
              description: "Pay securely online with Stripe (Visa, Mastercard, etc.).",
            },
          ],
  });
}

export async function createStripeCheckoutSession(order, userEmail) {
  const stripe = getStripe();
  const { frontendUrl } = getPaymentSettings();

  const lineItems = order.products.map((line) => ({
    price_data: {
      currency: "lkr",
      product_data: {
        name: line.productinfo.productName,
        metadata: { productId: line.productinfo.productId },
      },
      unit_amount: Math.round(line.productinfo.price * 100),
    },
    quantity: line.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: lineItems,
    success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/checkout?cancelled=1`,
    metadata: {
      orderId: order.orderId,
    },
  });

  return session;
}

export async function completeStripePayment(req, res) {
  if (!isStripeEnabled()) {
    return res.status(400).json({ message: "Stripe payments are not enabled." });
  }

  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ message: "Missing session_id." });
  }

  if (!req.user) {
    return res.status(403).json({ message: "Please login and try again." });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment was not completed." });
    }

    const order = await Order.findOne({ orderId: session.metadata?.orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.email !== req.user.email) {
      return res.status(403).json({ message: "This order does not belong to your account." });
    }

    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      order.stripeSessionId = session.id;
      await order.save();
    }

    res.json({
      message: "Payment confirmed successfully.",
      order,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to verify payment.",
      error: err.message,
    });
  }
}
