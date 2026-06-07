import Order from "../models/order.js";

import Product from "../models/product.js";

import { isAdmin } from "./userCont.js";

import { getPaymentSettings, isStripeEnabled } from "../lib/paymentConfig.js";

import { computePaymentSplit, resolvePaymentMethod } from "../lib/paymentSplit.js";

import { createStripeCheckoutSession } from "./paymentCont.js";

import { restoreOrderStock, finalizeOrderStock } from "../lib/stockService.js";
import { applyPosDetails } from "../lib/adminOrderPayment.js";
import { resolveWarranty } from "../lib/warranty.js";
import { sendBillOnPaymentSuccess } from "../lib/email.js";



async function buildOrderProducts(orderInfo, res) {

  let total = 0;

  let labelTotal = 0;

  const products = [];



  for (let i = 0; i < orderInfo.products.length; i++) {

    const requestedQty = Number(orderInfo.products[i].quantity) || 0;

    if (requestedQty < 1) {

      res.status(400).json({ message: "Each product must have a quantity of at least 1." });

      return null;

    }



    const item = await Product.findOne({ productId: orderInfo.products[i].productId });

    if (item == null) {

      res.status(404).json({

        message: "Product with productId " + orderInfo.products[i].productId + " not found",

      });

      return null;

    }

    if (item.isAvailable == false) {

      res.status(400).json({

        message: item.productName + " is currently unavailable.",

      });

      return null;

    }

    if (item.stock < requestedQty) {

      res.status(400).json({

        message: `Not enough stock for ${item.productName}. Only ${item.stock} left.`,

      });

      return null;

    }



    products[i] = {

      productinfo: {

        productId: item.productId,

        productName: item.productName,

        altNames: item.altNames,

        descriptions: item.descriptions,

        images: item.images,

        labeledPrice: item.labeledPrice,

        price: item.price,

        category: item.category,

        warranty: resolveWarranty(item.category, item.warranty),

      },

      quantity: requestedQty,

    };

    total += item.price * requestedQty;

    labelTotal += item.labeledPrice * requestedQty;

  }



  return { products, total, labelTotal };

}



function generateOrderId(lastOrder) {

  let orderId = "ABC00001";

  if (lastOrder.length > 0) {

    const lastOrderId = lastOrder[0].orderId;

    const lastOrderNumberString = lastOrderId.replace("ABC", "");

    const lastOrderNumber = parseInt(lastOrderNumberString);

    const newOrderNumber = lastOrderNumber + 1;

    const newOrderNumberString = String(newOrderNumber).padStart(5, "0");

    orderId = "ABC" + newOrderNumberString;

  }

  return orderId;

}



export async function createOrder(req, res) {

  if (req.user == null) {

    res.status(403).json({

      message: "Please login and try again",

    });

    return;

  }



  const orderInfo = req.body;

  const paymentSettings = getPaymentSettings();



  if (paymentSettings.mode === "stripe" && !isStripeEnabled()) {

    return res.status(503).json({

      message: "Stripe is not configured. Set STRIPE_SECRET_KEY or switch PAYMENT_MODE=free.",

    });

  }



  const { method: paymentMethod, error: methodError } = resolvePaymentMethod(

    orderInfo.paymentMethod,

    paymentSettings

  );

  if (methodError) {

    return res.status(400).json({ message: methodError });

  }



  if (orderInfo.name == null) {

    orderInfo.name = req.user.firstName + " " + req.user.lastName;

  }



  const built = await buildOrderProducts(orderInfo, res);

  if (!built) return;



  const { products, total, labelTotal } = built;



  let cashPercent = 100;

  let cardPercent = 0;

  let cashAmount = total;

  let cardAmount = 0;

  let paymentStatus = "pending_cod";



  if (paymentMethod === "stripe") {

    cashPercent = 0;

    cardPercent = 100;

    cashAmount = 0;

    cardAmount = total;

    paymentStatus = "awaiting_payment";

  } else if (paymentMethod === "split") {

    const split = computePaymentSplit(total, orderInfo.cashPercent);

    if (!split) {

      return res.status(400).json({

        message: "Cash percentage must be a whole number between 1 and 99.",

      });

    }

    cashPercent = split.cashPercent;

    cardPercent = split.cardPercent;

    cashAmount = split.cashAmount;

    cardAmount = split.cardAmount;

    paymentStatus = "awaiting_payment";

  }



  try {

    const lastOrder = await Order.find().sort({ _id: -1 }).limit(1);

    const orderId = generateOrderId(lastOrder);



    const order = new Order({

      orderId,

      name: orderInfo.name,

      email: req.user.email,

      phone: orderInfo.phone,

      address: orderInfo.address,

      products,

      labelTotal,

      total,

      paymentMethod,

      cashPercent,

      cardPercent,

      cashAmount,

      cardAmount,

      paymentStatus,

      stockDeducted: false,

    });



    const createdOrder = await order.save();



    try {

      await finalizeOrderStock(createdOrder);

    } catch (stockErr) {

      await Order.deleteOne({ orderId: createdOrder.orderId });

      return res.status(400).json({ message: stockErr.message });

    }



    if (paymentMethod === "stripe" || paymentMethod === "split") {

      const chargeAmount = paymentMethod === "split" ? cardAmount : total;

      const session = await createStripeCheckoutSession(

        createdOrder,

        req.user.email,

        chargeAmount

      );

      createdOrder.stripeSessionId = session.id;

      await createdOrder.save();



      return res.json({

        message: "Redirect to payment",

        order: createdOrder,

        checkoutUrl: session.url,

        requiresPayment: true,

      });

    }



    res.json({

      message: "Create Order successfully",

      order: createdOrder,

      requiresPayment: false,

    });

  } catch (err) {

    res.status(500).json({

      message: "Failed to create order",

      error: err.message,

    });

  }

}



export async function getOrders(req, res) {

  if (!isAdmin(req)) {

    return res.status(403).json({ message: "Admin access required." });

  }

  try {

    const orders = await Order.find().sort({ date: -1 });

    res.json(orders);

  } catch (err) {

    res.status(500).json({ message: "Failed to fetch orders.", error: err.message });

  }

}



export async function cancelPendingOrder(req, res) {

  if (req.user == null) {

    return res.status(403).json({ message: "Please login and try again." });

  }



  try {

    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {

      return res.status(404).json({ message: "Order not found." });

    }

    if (order.email !== req.user.email) {

      return res.status(403).json({ message: "This order does not belong to your account." });

    }

    if (order.paymentStatus !== "awaiting_payment") {

      return res.status(400).json({ message: "Only unpaid orders can be cancelled." });

    }



    if (order.stockDeducted) {

      await restoreOrderStock(order);

      order.stockDeducted = false;

    }



    order.paymentStatus = "cancelled";

    order.status = "cancelled";

    await order.save();



    res.json({ message: "Order cancelled and stock restored.", order });

  } catch (err) {

    res.status(500).json({ message: "Failed to cancel order.", error: err.message });

  }

}



export async function markPaymentSuccessful(req, res) {

  if (!isAdmin(req)) {

    return res.status(403).json({ message: "Admin access required." });

  }



  try {

    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {

      return res.status(404).json({ message: "Order not found." });

    }



    if (order.paymentStatus === "paid") {

      return res.status(400).json({ message: "Payment is already marked as successful." });

    }

    if (order.paymentStatus === "cancelled") {

      return res.status(400).json({ message: "Cancelled orders cannot be marked as paid." });

    }

    if (order.paymentStatus === "awaiting_payment") {

      return res.status(400).json({

        message: "Online card payment is still pending. Customer must complete Stripe payment first.",

      });

    }



    if (!order.stockDeducted) {

      await finalizeOrderStock(order);

    }



    if (order.paymentStatus === "pending_pos") {

      const cardAmount =

        order.paymentMethod === "split" ? order.cardAmount : order.total;

      applyPosDetails(order, req.body, cardAmount);

      order.paymentStatus =

        order.paymentMethod === "split" && order.cashAmount > 0

          ? "partial_paid"

          : "paid";

    } else {

      order.paymentStatus = "paid";

    }

    if (order.status === "pending") {

      order.status = "processing";

    }

    await order.save();

    const billEmail = await sendBillOnPaymentSuccess(order);

    res.json({ message: "Payment marked as successful.", order, billEmail });

  } catch (err) {

    const status =

      err.message.includes("stock") || err.message.includes("POS") ? 400 : 500;

    res.status(status).json({ message: err.message || "Failed to update payment.", error: err.message });

  }

}



export async function updateOrderStatus(req, res) {

  if (!isAdmin(req)) {

    return res.status(403).json({ message: "Admin access required." });

  }

  const { status } = req.body;

  const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];

  if (!status || !allowed.includes(status)) {

    return res.status(400).json({ message: "Invalid status." });

  }

  try {

    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {

      return res.status(404).json({ message: "Order not found." });

    }



    const previousStatus = order.status;



    if (status === "cancelled" && previousStatus !== "cancelled" && order.stockDeducted) {

      await restoreOrderStock(order);

      order.stockDeducted = false;

    }



    order.status = status;

    await order.save();



    res.json({ message: "Order status updated.", order });

  } catch (err) {

    res.status(500).json({ message: "Failed to update order.", error: err.message });

  }

}


