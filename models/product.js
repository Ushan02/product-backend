import mongoose from "mongoose";

const LAPTOP_SUB_CATEGORIES = ["gaming", "business_and_student"];

const ACCESSORY_SUB_CATEGORIES = [
  "memory",
  "keyboard",
  "mouse",
  "headset",
  "cooling_pad",
  "virusgard",
  "mouse_pad",
  "speakers",
  "cables",
  "lightning",
  "charger",
  "usb_flash_drive",
  "battery",
  "hdd_enclosure",
  "laptop_bags",
];

const ALL_SUB_CATEGORIES = [...LAPTOP_SUB_CATEGORIES, ...ACCESSORY_SUB_CATEGORIES];

const specsSchema = new mongoose.Schema(
  {
    processorBrand: { type: String, default: null },
    processorModel: { type: String, default: null },
    ram: { type: Number, default: null },
    storageType: {
      type: String,
      enum: ["SSD", "HDD", "SSD+HDD", null],
      default: null,
    },
    storageSize: { type: Number, default: null },
    displaySize: { type: Number, default: null },
    gpuBrand: { type: String, default: null },
    gpuModel: { type: String, default: null },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["laptop", "accessories"],
    },
    subCategory: {
      type: String,
      required: true,
      enum: ALL_SUB_CATEGORIES,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    specs: {
      type: specsSchema,
      default: () => ({}),
    },
    altNames: [{ type: String }],
    descriptions: {
      type: String,
      required: true,
    },
    images: [{ type: String }],
    labeledPrice: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ "specs.processorModel": 1 });
productSchema.index({ "specs.gpuModel": 1 });

export const LAPTOP_SUBS = LAPTOP_SUB_CATEGORIES;
export const ACCESSORY_SUBS = ACCESSORY_SUB_CATEGORIES;
export const ALL_SUBS = ALL_SUB_CATEGORIES;

const Product = mongoose.model("product", productSchema);
export default Product;
