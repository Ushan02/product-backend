import express from "express";
import { deleteProduct, getProduct, saveProduct } from "../Controller/productCont.js";


const productRouter = express.Router()

productRouter.get("/",getProduct)

productRouter.post("/",saveProduct)
productRouter.delete("/:productId",deleteProduct)


export default productRouter;