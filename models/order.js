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

    customerId : {

        type : String,

        default : null,

        trim : true,

        uppercase : true,

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

    paymentMethod : {

        type : String,

        enum : ["cod", "card", "stripe", "split"],

        default : "cod"

    },

    cashPercent : {

        type : Number,

        default : 100,

        min : 0,

        max : 100,

    },

    cardPercent : {

        type : Number,

        default : 0,

        min : 0,

        max : 100,

    },

    cashAmount : {

        type : Number,

        default : 0,

        min : 0,

    },

    cardAmount : {

        type : Number,

        default : 0,

        min : 0,

    },

    paymentStatus : {

        type : String,

        enum : ["pending_cod", "pending_pos", "awaiting_payment", "partial_paid", "paid", "failed", "cancelled"],

        default : "pending_cod"

    },

    posTransactionRef : {

        type : String,

        default : null,

        trim : true,

    },

    posMachineId : {

        type : String,

        default : null,

        trim : true,

    },

    posCardAmount : {

        type : Number,

        default : null,

        min : 0,

    },

    posNotes : {

        type : String,

        default : null,

        trim : true,

    },

    posConfirmedAt : {

        type : Date,

        default : null,

    },

    stripeSessionId : {

        type : String,

        default : null

    },

    stockDeducted : {

        type : Boolean,

        default : false

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

                    },

                    category : {

                        type : String,

                        default : null

                    },

                    warranty : {

                        type : String,

                        default : null

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


