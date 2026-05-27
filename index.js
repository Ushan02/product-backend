import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import cors from "cors";
import productRouter from './routes/productrouter.js';
import userRouter from './routes/userrouter.js';
import orderRouter from './routes/orderrouter.js';
import reviewRouter from './routes/reviewrouter.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());


app.use((req, res, next) => {
    const tokenString = req.header("Authorization");
    
    if (tokenString) {

        const token = tokenString.replace("Bearer ", "");
        
        jwt.verify(token,process.env.JWT_KEY, (err, decoded) => {
            if (err) {
                console.log("Invalid token detected");
                return res.status(403).json({
                    message: "Invalid token"
                });
            }
            req.user = decoded;
            next();
        });
    } else {
       
        next();
    }
});




mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("Connected to the MongoDB database successfully");
    })
    .catch((err) => {
        console.error("Database connection failed!");
        console.error("Reason:", err.message); 
    });

// Route Definitions
app.use("/api/product", productRouter);
app.use("/api/users", userRouter);
app.use("/api/order", orderRouter);
app.use("/api/review", reviewRouter);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});