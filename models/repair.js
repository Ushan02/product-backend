import mongoose from "mongoose";

const repairSchema = mongoose.Schema(
  {
    repairId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      default: "",
    },
    customerName: {
      type: String,
      default: "",
    },
    getDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    receiveDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["processing", "done", "cancelled"],
      default: "processing",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const Repair = mongoose.model("repairs", repairSchema);
export default Repair;
