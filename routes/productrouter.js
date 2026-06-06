import express from "express";
import {
  getProducts,
  getFilters,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../Controller/productCont.js";

const productRouter = express.Router();

productRouter.get("/filters", getFilters);
productRouter.get("/", getProducts);
productRouter.post("/", addProduct);
productRouter.get("/:id", getProductById);
productRouter.put("/:id", updateProduct);
productRouter.delete("/:id", deleteProduct);

export default productRouter;
