import Repair from "../models/repair.js";
import Order from "../models/order.js";
import Users from "../models/Users.js";
import { isAdmin } from "./userCont.js";
import { isValidCustomerId, normalizeCustomerId } from "../lib/customerId.js";

async function generateRepairId() {
  const lastRepair = await Repair.find().sort({ _id: -1 }).limit(1);
  let repairId = "REP00001";
  if (lastRepair.length > 0) {
    const lastNumber = parseInt(String(lastRepair[0].repairId).replace("REP", ""), 10);
    const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
    repairId = `REP${String(nextNumber).padStart(5, "0")}`;
  }
  return repairId;
}

export async function getRepairs(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }
  try {
    const repairs = await Repair.find().sort({ getDate: -1 });
    res.json(repairs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch repairs.", error: err.message });
  }
}

export async function createRepair(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const customerId = normalizeCustomerId(req.body.customerId);
  const { orderId, productId, getDate, receiveDate, notes, status } = req.body;
  const allowedStatuses = ["processing", "done", "cancelled"];

  if (!isValidCustomerId(customerId)) {
    return res.status(400).json({ message: "Customer ID must be 10 or 11 digits ending with V." });
  }
  if (!orderId || !productId) {
    return res.status(400).json({ message: "Order ID and product ID are required." });
  }

  try {
    const customer = await Users.findOne({ customerId, role: "customer" });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found for this ID." });
    }

    const order = await Order.findOne({ orderId, email: customer.email });
    if (!order) {
      return res.status(404).json({ message: "Order not found for this customer." });
    }

    const line = order.products?.find((item) => item.productinfo?.productId === productId);
    if (!line) {
      return res.status(400).json({ message: "This product was not found in the selected order." });
    }

    const repairId = await generateRepairId();
    const repair = await Repair.create({
      repairId,
      orderId,
      customerId,
      productId,
      productName: line.productinfo?.productName || "",
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      getDate: getDate ? new Date(getDate) : new Date(),
      receiveDate: receiveDate ? new Date(receiveDate) : null,
      status: allowedStatuses.includes(status) ? status : "processing",
      notes: notes || "",
    });

    res.status(201).json({ message: "Repair record created.", repair });
  } catch (err) {
    res.status(500).json({ message: "Failed to create repair.", error: err.message });
  }
}

export async function updateRepair(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  try {
    const repair = await Repair.findOne({ repairId: req.params.repairId });
    if (!repair) {
      return res.status(404).json({ message: "Repair record not found." });
    }

    const { getDate, receiveDate, notes, status } = req.body;
    const allowedStatuses = ["processing", "done", "cancelled"];

    if (getDate !== undefined) repair.getDate = getDate ? new Date(getDate) : repair.getDate;
    if (receiveDate !== undefined) {
      repair.receiveDate = receiveDate ? new Date(receiveDate) : null;
    }
    if (notes !== undefined) repair.notes = notes;
    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Status must be processing, done, or cancelled." });
      }
      repair.status = status;
      if (status === "done" && !repair.receiveDate) {
        repair.receiveDate = new Date();
      }
    }

    await repair.save();
    res.json({ message: "Repair record updated.", repair });
  } catch (err) {
    res.status(500).json({ message: "Failed to update repair.", error: err.message });
  }
}

export async function lookupCustomerForRepair(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const customerId = normalizeCustomerId(req.query.customerId);
  if (!isValidCustomerId(customerId)) {
    return res.status(400).json({ message: "Customer ID must be 10 or 11 digits ending with V." });
  }

  try {
    const customer = await Users.findOne({ customerId, role: "customer" }).select(
      "firstName lastName email customerId"
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const orders = await Order.find({ email: customer.email }).sort({ date: -1 });
    const purchasedProducts = [];

    for (const order of orders) {
      for (const line of order.products || []) {
        const info = line.productinfo || {};
        if (!info.productId) continue;
        purchasedProducts.push({
          orderId: order.orderId,
          productId: info.productId,
          productName: info.productName || "",
          quantity: line.quantity || 1,
          orderDate: order.date,
        });
      }
    }

    res.json({
      customer: {
        customerId: customer.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
      purchasedProducts,
    });
  } catch (err) {
    res.status(500).json({ message: "Customer lookup failed.", error: err.message });
  }
}
