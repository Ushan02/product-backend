import express from "express";
import {
  getProducts,
  getFilters,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  reduceStock,
  restock,
} from "../Controller/productCont.js";

const productRouter = express.Router();

productRouter.get("/filters", getFilters);
productRouter.get("/", getProducts);
productRouter.post("/", addProduct);
productRouter.patch("/:id/reduce-stock", reduceStock);
productRouter.patch("/:id/restock", restock);
productRouter.patch("/:id/stock", adjustStock);
productRouter.get("/:id", getProductById);
productRouter.put("/:id", updateProduct);
productRouter.delete("/:id", deleteProduct);

export default productRouter;
