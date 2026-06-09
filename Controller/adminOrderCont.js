import Order from "../models/order.js";
import Product from "../models/product.js";
import Users from "../models/Users.js";
import { isAdmin } from "./userCont.js";
import { isValidCustomerId, normalizeCustomerId } from "../lib/customerId.js";
import { finalizeOrderStock } from "../lib/stockService.js";
import {
  resolveAdminPaymentMethod,
  buildAdminPaymentPlan,
  applyPosDetails,
} from "../lib/adminOrderPayment.js";
import { resolveWarranty } from "../lib/warranty.js";
import { sendBillOnPaymentSuccess } from "../lib/email.js";

async function buildOrderProducts(orderInfo, res) {
  let total = 0;
  let labelTotal = 0;
  const products = [];

  if (!Array.isArray(orderInfo.products) || orderInfo.products.length === 0) {
    res.status(400).json({ message: "At least one product is required." });
    return null;
  }

  for (let i = 0; i < orderInfo.products.length; i++) {
    const requestedQty = Number(orderInfo.products[i].quantity) || 0;
    if (requestedQty < 1) {
      res.status(400).json({ message: "Each product must have a quantity of at least 1." });
      return null;
    }

    const item = await Product.findOne({ productId: orderInfo.products[i].productId });
    if (!item) {
      res.status(404).json({
        message: "Product with productId " + orderInfo.products[i].productId + " not found",
      });
      return null;
    }
    if (!item.isAvailable) {
      res.status(400).json({ message: item.productName + " is currently unavailable." });
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

const ALLOWED_ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function resolveOrderStatus(status) {
  return ALLOWED_ORDER_STATUSES.includes(status) ? status : "delivered";
}

function generateOrderId(lastOrder) {
  let orderId = "ABC00001";
  if (lastOrder.length > 0) {
    const lastOrderId = lastOrder[0].orderId;
    const lastOrderNumber = parseInt(lastOrderId.replace("ABC", ""), 10);
    const newOrderNumberString = String(lastOrderNumber + 1).padStart(5, "0");
    orderId = "ABC" + newOrderNumberString;
  }
  return orderId;
}

export async function createAdminOrder(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const orderInfo = req.body;
  const markPaid = orderInfo.markPaymentSuccessful !== false;

  const { method: paymentMethod, error: methodError } = resolveAdminPaymentMethod(
    orderInfo.paymentMethod
  );
  if (methodError) {
    return res.status(400).json({ message: methodError });
  }

  let customerName = orderInfo.name?.trim() || "";
  let customerEmail = orderInfo.email?.trim() || "";
  let customerId = normalizeCustomerId(orderInfo.customerId);

  if (customerId) {
    if (!isValidCustomerId(customerId)) {
      return res.status(400).json({
        message: "Customer ID must be 10 or 11 numbers with V at the end (e.g. 1999236512V).",
      });
    }
    const customer = await Users.findOne({ customerId, role: "customer" });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found for this ID." });
    }
    customerName = customerName || `${customer.firstName} ${customer.lastName}`.trim();
    customerEmail = customerEmail || customer.email;
  }

  if (!customerName || !customerEmail) {
    return res.status(400).json({ message: "Customer name and email are required." });
  }
  if (!orderInfo.phone || !orderInfo.address?.trim()) {
    return res.status(400).json({ message: "Phone and address are required." });
  }

  const built = await buildOrderProducts(orderInfo, res);
  if (!built) return;

  const { products, total, labelTotal } = built;
  const plan = buildAdminPaymentPlan(paymentMethod, total, orderInfo.cashPercent, markPaid);
  if (plan.error) {
    return res.status(400).json({ message: plan.error });
  }

  const hasPosRef = Boolean(String(orderInfo.posTransactionRef || "").trim());
  const applyPos =
    markPaid &&
    hasPosRef &&
    (paymentMethod === "card" || paymentMethod === "split");

  try {
    const lastOrder = await Order.find().sort({ _id: -1 }).limit(1);
    const orderId = generateOrderId(lastOrder);

    const order = new Order({
      orderId,
      name: customerName,
      email: customerEmail,
      customerId: customerId || null,
      phone: orderInfo.phone,
      address: orderInfo.address.trim(),
      products,
      labelTotal,
      total,
      paymentMethod,
      cashPercent: plan.cashPct,
      cardPercent: plan.cardPct,
      cashAmount: plan.cashAmount,
      cardAmount: plan.cardAmount,
      paymentStatus: plan.paymentStatus,
      status: resolveOrderStatus(orderInfo.status),
      stockDeducted: false,
    });

    if (applyPos) {
      applyPosDetails(order, orderInfo, paymentMethod === "split" ? plan.cardAmount : total);
    }

    const createdOrder = await order.save();

    try {
      await finalizeOrderStock(createdOrder);
    } catch (stockErr) {
      await Order.deleteOne({ orderId: createdOrder.orderId });
      return res.status(400).json({ message: stockErr.message });
    }

    const billEmail = await sendBillOnPaymentSuccess(createdOrder);

    res.status(201).json({
      message: "Order created with payment successful.",
      order: createdOrder,
      billEmail,
    });
  } catch (err) {
    const status = err.message.includes("POS") ? 400 : 500;
    res.status(status).json({
      message: err.message || "Failed to create order.",
      error: err.message,
    });
  }
}
