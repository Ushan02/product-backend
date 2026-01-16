import express from "express";
import { deleteProduct, getProduct, saveProduct, updateProduct } from "../Controller/productCont.js";


const productRouter = express.Router()

productRouter.get("/",getProduct)

productRouter.post("/",saveProduct)
productRouter.delete("/:productId",deleteProduct)
productRouter.put("/:productId",updateProduct)


export default productRouter;