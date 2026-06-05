import mongoose from "mongoose";    

const productSchema = mongoose.Schema(
    {
        productId : {
            type : String,
            required : true,
            unique : true
        },

        productName : {
            type : String,
            required : true
        },

        altNames : [{
            type : String
        }],

        descriptions : {
            type : String,
            required: true
        },

        images : [
            {type: String}
        ],

        labeledPrice : {
            type : Number,
            required : true
        },
        price : {
            type : Number,
            required : true
        },
        isAvailable : {
            type: Boolean,
            required : true,
            default : true
        },
        stock : {
            type : Number,
            required : true,
            default : 0,
            min : 0
        }
    }
)

const Product = mongoose.model("product",productSchema)
export default Product;