import Order from "../models/order.js";

import { getPaymentSettings, isStripeEnabled } from "../lib/paymentConfig.js";

import { getStripe } from "../lib/stripeClient.js";

import { finalizeOrderStock } from "../lib/stockService.js";
import { sendBillOnPaymentSuccess } from "../lib/email.js";



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

              label: "Cash",

              description: "Pay 100% with cash when your order is delivered.",

            },

          ]

        : [

            {

              id: "cod",

              label: "Cash",

              description: "Pay 100% with cash on delivery.",

            },

            {

              id: "stripe",

              label: "Card",

              description: "Pay 100% securely online with your card (Stripe).",

            },

            {

              id: "split",

              label: "Cash + Card",

              description: "Pay part in cash on delivery and the rest by card now.",

            },

          ],

  });

}



export async function createStripeCheckoutSession(order, userEmail, chargeAmount = null) {

  const stripe = getStripe();

  const { frontendUrl } = getPaymentSettings();



  const amount = chargeAmount ?? order.total;

  const isPartial = order.paymentMethod === "split" && amount < order.total;



  const lineItems = isPartial

    ? [

        {

          price_data: {

            currency: "lkr",

            product_data: {

              name: `Order ${order.orderId} — card payment (${order.cardPercent}%)`,

              metadata: { orderId: order.orderId },

            },

            unit_amount: Math.round(amount * 100),

          },

          quantity: 1,

        },

      ]

    : order.products.map((line) => ({

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



    let billEmail = { sent: false, skipped: true };

    if (order.paymentStatus !== "paid") {

      try {

        await finalizeOrderStock(order);

      } catch (stockErr) {

        order.paymentStatus = "failed";

        await order.save();

        return res.status(400).json({

          message: `${stockErr.message} Payment received — contact support for a refund.`,

        });

      }

      order.paymentStatus =

        order.paymentMethod === "split" ? "partial_paid" : "paid";

      order.stripeSessionId = session.id;

      if (order.status === "pending") {

        order.status = "processing";

      }

      await order.save();

      if (order.paymentStatus === "paid") {

        billEmail = await sendBillOnPaymentSuccess(order);

      }

    }

    res.json({

      message: "Payment confirmed successfully.",

      order,

      billEmail,

    });

  } catch (err) {

    res.status(500).json({

      message: "Failed to verify payment.",

      error: err.message,

    });

  }

}

