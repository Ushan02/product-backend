import Order from "../models/order.js"
import Product from "../models/product.js";

export async function createOrder(req, res) {
    // get user information
    if (req.user == null) {
        res.status(403).json({
            message: "Please login and try again"
        });
        return;
    }

    const orderInfo = req.body;

    // get name of current user if not provided
    if (orderInfo.name == null) {
        orderInfo.name = req.user.firstName + " " + req.user.lastName;
    }

    // Order id generate
    let orderId = "ABC00001";

    const lastOrder = await Order.find().sort({ _id: -1 }).limit(1);

    if (lastOrder.length > 0) {
        const lastOrderId = lastOrder[0].orderId;
        const lastOrderNumberString = lastOrderId.replace("ABC", "");
        const lastOrderNumber = parseInt(lastOrderNumberString);
        const newOrderNumber = lastOrderNumber + 1;
        const newOrderNumberString = String(newOrderNumber).padStart(5, '0');
        orderId = "ABC" + newOrderNumberString;
    }

    // Create order object
    try {

        let total =0;
        let labelTotal=0;
        const products = []

        for (let i=0;i< orderInfo.products.length ; i++){
            const item = await Product.findOne({productId:orderInfo.products[i].productId})
            if(item == null){
                res.status(404).json({
                    message : "Product with productId "+orderInfo.products[i].productId + "not found"
                })

                return
            }
            if (item.isAvailable == false){
                res.status(404).json({
                    message : "Product with productId "+orderInfo.products[i].productId + "not found"
                })

                return
            }
            products[i]={
                productinfo :{
                    productId :item.productId,
                    productName : item.productName,
                    altNames :item.altNames,
                    descriptions :item.descriptions,
                    images :item.images,
                    labeledPrice : item.labeledPrice,
                    price : item.price
                },
                quantity : orderInfo.products[i].quantity
            }
            total += (item.price * orderInfo.products[i].quantity)
            labelTotal += (item.labeledPrice* orderInfo.products[i].quantity)
        }

        const order = new Order({
            orderId: orderId,
            name: orderInfo.name,
            email : req.user.email,
            phone : orderInfo.phone,
            address: orderInfo.address,
            products: products,
            labelTotal : labelTotal,
            total : total
    });

   
        const createdOrder = await order.save();
        res.json({
            message: "Create Order successfully",
            order: createdOrder
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to create order",
            error: err
        });
    }
}
