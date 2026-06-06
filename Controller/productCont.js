import Product, { LAPTOP_SUBS, ACCESSORY_SUBS } from "../models/product.js";
import { isAdmin } from "./userCont.js";

const CATEGORIES = ["laptop", "accessories"];

const GAMING_PROCESSOR_BRANDS = ["Intel", "AMD"];
const BUSINESS_PROCESSOR_BRANDS = ["Intel", "AMD", "Apple"];
const CORE_I_MODELS = ["Core i3", "Core i5", "Core i7", "Core i9"];
const CORE_ULTRA_MODELS = [
  "Core Ultra 3",
  "Core Ultra 5",
  "Core Ultra 7",
  "Core Ultra 9",
];
const RYZEN_MODELS = ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"];
const ALL_PROCESSOR_MODELS = [
  ...CORE_I_MODELS,
  ...CORE_ULTRA_MODELS,
  ...RYZEN_MODELS,
];
const GAMING_PROCESSOR_MODELS = ALL_PROCESSOR_MODELS;
const BUSINESS_PROCESSOR_MODELS = ALL_PROCESSOR_MODELS;
const STORAGE_TYPES = ["SSD", "HDD", "SSD+HDD"];
const GPU_BRANDS = ["NVIDIA", "AMD"];

function parseArrayParam(value) {
  if (value === undefined || value === null || value === "") return null;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length ? items : null;
}

function parseCategory(value) {
  if (!value) return null;
  const category = String(value).trim().toLowerCase();
  return CATEGORIES.includes(category) ? category : null;
}

function parseSubCategory(value) {
  if (!value) return null;
  const sub = String(value).trim().toLowerCase();
  return [...LAPTOP_SUBS, ...ACCESSORY_SUBS].includes(sub) ? sub : null;
}

function normalizeStock(value) {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock < 0) return null;
  return Math.floor(stock);
}

function normalizeBrand(value) {
  const brand = String(value || "").trim();
  return brand ? brand.toUpperCase() : null;
}

function emptySpecs() {
  return {
    processorBrand: null,
    processorModel: null,
    ram: null,
    storageType: null,
    storageSize: null,
    displaySize: null,
    gpuBrand: null,
    gpuModel: null,
  };
}

function normalizeSpecs(body, subCategory) {
  if (subCategory !== "gaming" && subCategory !== "business_and_student") {
    return emptySpecs();
  }

  const specs = {
    processorBrand: body.processorBrand || null,
    processorModel: body.processorModel || null,
    ram: body.ram !== undefined && body.ram !== "" ? Number(body.ram) : null,
    storageType: body.storageType || null,
    storageSize:
      body.storageSize !== undefined && body.storageSize !== ""
        ? Number(body.storageSize)
        : null,
    displaySize:
      body.displaySize !== undefined && body.displaySize !== ""
        ? Number(body.displaySize)
        : null,
    gpuBrand: null,
    gpuModel: null,
  };

  if (subCategory === "gaming") {
    specs.gpuBrand = body.gpuBrand || null;
    specs.gpuModel = body.gpuModel ? String(body.gpuModel).trim() : null;
  }

  return specs;
}

function validateProductPayload(data, isUpdate = false) {
  const errors = [];

  const category = data.category !== undefined ? parseCategory(data.category) : null;
  const subCategory =
    data.subCategory !== undefined ? parseSubCategory(data.subCategory) : null;
  const brand = data.brand !== undefined ? normalizeBrand(data.brand) : null;

  if (!isUpdate || data.category !== undefined) {
    if (!category) errors.push("category must be laptop or accessories.");
  }

  if (!isUpdate || data.subCategory !== undefined) {
    if (!subCategory) errors.push("subCategory is invalid.");
    if (category === "laptop" && subCategory && !LAPTOP_SUBS.includes(subCategory)) {
      errors.push("Laptop subCategory must be gaming or business_and_student.");
    }
    if (category === "accessories" && subCategory && !ACCESSORY_SUBS.includes(subCategory)) {
      errors.push("Invalid accessories subCategory.");
    }
  }

  if (!isUpdate || data.brand !== undefined) {
    if (!brand) errors.push("brand is required.");
  }

  const effectiveSub = subCategory || data.subCategory;

  if (effectiveSub === "gaming") {
    const specs = normalizeSpecs(data.specs || data, "gaming");
    if (!specs.processorBrand || !GAMING_PROCESSOR_BRANDS.includes(specs.processorBrand)) {
      errors.push("gaming laptop requires processorBrand Intel or AMD.");
    }
    if (!specs.processorModel || !GAMING_PROCESSOR_MODELS.includes(specs.processorModel)) {
      errors.push("gaming laptop requires a valid processorModel.");
    }
    if (!specs.gpuBrand || !GPU_BRANDS.includes(specs.gpuBrand)) {
      errors.push("gaming laptop requires gpuBrand NVIDIA or AMD.");
    }
    if (!specs.gpuModel) errors.push("gaming laptop requires gpuModel.");
  }

  if (effectiveSub === "business_and_student") {
    const specs = normalizeSpecs(data.specs || data, "business_and_student");
    if (!specs.processorBrand || !BUSINESS_PROCESSOR_BRANDS.includes(specs.processorBrand)) {
      errors.push("business_and_student laptop requires processorBrand Intel, AMD, or Apple.");
    }
    if (!specs.processorModel || !BUSINESS_PROCESSOR_MODELS.includes(specs.processorModel)) {
      errors.push("business_and_student laptop requires a valid processorModel.");
    }
  }

  return { errors, category, subCategory, brand };
}

function buildProductFilter(req) {
  const filter = isAdmin(req) ? {} : { isAvailable: true };

  const category = parseCategory(req.query.category);
  if (category) filter.category = category;

  const subCategory = parseSubCategory(req.query.subCategory);
  if (subCategory) filter.subCategory = subCategory;

  const brands = parseArrayParam(req.query.brand);
  if (brands) filter.brand = { $in: brands.map((b) => b.toUpperCase()) };

  const processorModels = parseArrayParam(req.query.processorModel);
  if (processorModels) filter["specs.processorModel"] = { $in: processorModels };

  const gpuModels = parseArrayParam(req.query.gpuModel);
  if (gpuModels) filter["specs.gpuModel"] = { $in: gpuModels };

  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : null;

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {};
    if (Number.isFinite(minPrice)) filter.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) filter.price.$lte = maxPrice;
  }

  return filter;
}

// GET /api/products — pass page & limit for pagination; omit both for full list (admin)
export async function getProducts(req, res) {
  try {
    const filter = buildProductFilter(req);
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    if (Number.isFinite(page) && page >= 1 && Number.isFinite(limit) && limit >= 1) {
      const safeLimit = Math.min(Math.floor(limit), 50);
      const safePage = Math.floor(page);
      const [products, total] = await Promise.all([
        Product.find(filter)
          .sort({ _id: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Product.countDocuments(filter),
      ]);

      return res.json({
        products,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      });
    }

    const products = await Product.find(filter).sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to get products", error: err.message });
  }
}

// GET /api/products/filters
export async function getFilters(req, res) {
  try {
    const baseFilter = isAdmin(req) ? {} : { isAvailable: true };

    const category = parseCategory(req.query.category);
    if (category) baseFilter.category = category;

    const subCategory = parseSubCategory(req.query.subCategory);
    if (subCategory) baseFilter.subCategory = subCategory;

    const [brands, processorModels, gpuModels, subCategories] = await Promise.all([
      Product.distinct("brand", baseFilter),
      Product.distinct("specs.processorModel", {
        ...baseFilter,
        "specs.processorModel": { $nin: [null, ""] },
      }),
      Product.distinct("specs.gpuModel", {
        ...baseFilter,
        "specs.gpuModel": { $nin: [null, ""] },
      }),
      !category || category === "accessories"
        ? Product.distinct(
            "subCategory",
            category === "accessories"
              ? { ...baseFilter, category: "accessories" }
              : baseFilter
          )
        : Promise.resolve([]),
    ]);

    const priceBounds = await Product.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    const bounds = priceBounds[0] || { minPrice: 0, maxPrice: 0 };

    res.json({
      brands: brands.filter(Boolean).sort(),
      processorModels: processorModels.filter(Boolean).sort(),
      gpuModels: gpuModels.filter(Boolean).sort(),
      subCategories: subCategories.filter(Boolean).sort(),
      minPrice: bounds.minPrice ?? 0,
      maxPrice: bounds.maxPrice ?? 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to get filters", error: err.message });
  }
}

// GET /api/products/:id
export async function getProductById(req, res) {
  try {
    const product = await Product.findOne({ productId: req.params.id });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (!product.isAvailable && !isAdmin(req)) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Internal server error.", error: err.message });
  }
}

// POST /api/products
export async function addProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "You are not allowed to add a product." });
  }

  try {
    const {
      productId,
      productName,
      descriptions,
      labeledPrice,
      price,
      altNames,
      images,
      isAvailable,
    } = req.body;

    if (!productId?.trim() || !productName?.trim() || !descriptions?.trim()) {
      return res.status(400).json({ message: "productId, productName, and descriptions are required." });
    }

    const stock = normalizeStock(req.body.stock ?? 0);
    if (stock === null) {
      return res.status(400).json({ message: "Stock must be a non-negative number." });
    }

    const { errors, category, subCategory, brand } = validateProductPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const specs = normalizeSpecs(req.body.specs || req.body, subCategory);

    const product = new Product({
      productId: productId.trim(),
      productName: productName.trim(),
      category,
      subCategory,
      brand,
      specs,
      altNames: Array.isArray(altNames) ? altNames : [],
      descriptions: descriptions.trim(),
      images: Array.isArray(images) ? images : [],
      labeledPrice: Number(labeledPrice),
      price: Number(price),
      stock,
      isAvailable: isAvailable !== false,
    });

    await product.save();
    res.status(201).json({ message: "Product added successfully.", product });
  } catch (err) {
    console.error("Add product error:", err.message);
    res.status(500).json({ message: "Failed to add product.", error: err.message });
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "You are not allowed to update a product." });
  }

  try {
    const existing = await Product.findOne({ productId: req.params.id });
    if (!existing) {
      return res.status(404).json({ message: "Product not found." });
    }

    const update = { ...req.body };
    delete update.productId;

    const { errors, category, subCategory, brand } = validateProductPayload(
      { ...existing.toObject(), ...update },
      true
    );
    if (errors.length) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    if (update.stock !== undefined) {
      const stock = normalizeStock(update.stock);
      if (stock === null) {
        return res.status(400).json({ message: "Stock must be a non-negative number." });
      }
      update.stock = stock;
    }

    if (category) update.category = category;
    if (subCategory) update.subCategory = subCategory;
    if (brand) update.brand = brand;

    const effectiveSub = subCategory || existing.subCategory;
    if (update.specs || update.processorBrand || effectiveSub) {
      update.specs = normalizeSpecs(
        { ...existing.specs?.toObject?.() || existing.specs || {}, ...update.specs, ...update },
        effectiveSub
      );
    }

    delete update.processorBrand;
    delete update.processorModel;
    delete update.ram;
    delete update.storageType;
    delete update.storageSize;
    delete update.displaySize;
    delete update.gpuBrand;
    delete update.gpuModel;

    await Product.updateOne({ productId: req.params.id }, { $set: update });
    const product = await Product.findOne({ productId: req.params.id });
    res.json({ message: "Product updated successfully.", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product.", error: err.message });
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "You are not allowed to delete a product." });
  }

  try {
    const result = await Product.deleteOne({ productId: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.json({ message: "Product deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product.", error: err.message });
  }
}

// Legacy aliases
export const getProduct = getProducts;
export const saveProduct = addProduct;
