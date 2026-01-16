import Product from "../models/product.js"
import { isAdmin } from "./userCont.js";

 export async function getProduct(req,res){
        //console.log(req.body)
        /*Product.find().then(
            (data)=>{
                res.json(data)
            }
        )*/

            try{
                if(isAdmin(req)){

                    const product = await Product.find()
                    res.json(product)
                }
                else{
                    const product = await Product.find({isAvailable : true})
                    res.json(product)
                }
                
            }
            catch(err){
                res.json(
                    {
                        message : "Faild to get product",
                        error : err
                        
                    }
                )

            }
}

export function saveProduct(req,res){
        //console.log(req.body)

        if(!isAdmin(req)){
            res.status(403).json({
                message : "you not allow to add a product"
            })
            return
        }

        const product = new Product(
            req.body

        );

        product.save().then(()=>{
            res.json({
                message : "product add successfully"
            })
        }).catch(()=>{
            res.json({
                message : "Failed add product"
            })
        });
}

export async function deleteProduct(req,res){
    if(!isAdmin(req)){
        res.status(403).json({
            message : "your not allo to delete product"
        })
        return

    }
    try{
        await Product.deleteOne({productId : req.params.productId})

        res.json({
            message : "Product delete succusfully"
        })
    }catch(err){
        res.status(500).json({
                message : "fail to delete",
                error : err
            })

    }
    
}

export async function updateProduct(req,res){
    if(!isAdmin(req)){
        res.status(403).json({
            message : "your not allo to update product"
        })
        return

    }

    const updatingData = req.body
    try{
        await Product.updateOne({
            productId : req.params.productId,
            updateProduct
            
        })

        res.json({
            message : "Product updated succusfully"
        })
    }catch(err){
        res.status(500).json({
                message : "fail to update",
                error : err
            })

    }
    
}