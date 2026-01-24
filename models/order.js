import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
    orderId : {
        type : String,
        required : true,
        unique : true
    },
    email : {
        type : String,
        required : true
    },

    name : {
        type : String,
        required : true
    },
    phone : {
        type : Number,
        required : true
    },

    address : {
        type : String,
        required : true 
    },
    status : {
        type : String,
        required : true,
        default : "pending"
    },
    labelTotal : {
        type : String,
        required : true
    },
    total : {
        type : Number,
        required : true
    },

    products : [
        {
            productinfo : {
                    productId : {
                        type : String,
                        required : true
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
                    }

            },
            quantity : {
                type : Number,
                required : true
            }
        }
    ],

    date : {
        type : Date,
        default : Date.now
    }
})

const Order = mongoose.model("Order", orderSchema)
export default Order;