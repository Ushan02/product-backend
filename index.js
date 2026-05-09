import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";

// Import Routers - Ensure these file paths and names match your directory structure
import productRouter from './routes/productrouter.js';
import userRouter from './routes/userrouter.js';
import orderRouter from './routes/orderrouter.js';
import reviewRouter from './routes/reviewrouter.js';

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());

// JWT Authentication Middleware
app.use((req, res, next) => {
    const tokenString = req.header("Authorization");
    
    if (tokenString) {
        // Remove "Bearer " prefix if present
        const token = tokenString.replace("Bearer ", "");
        
        jwt.verify(token, "Ushan1234!!", (err, decoded) => {
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
        // No token provided, proceed as guest
        next();
    }
});

// Database Connection
// Replace 'elesafe' with your actual database name if different
const mongoURI = "mongodb://admin:1234@ac-b9ulqcj-shard-00-00.ba9yjkc.mongodb.net:27017,ac-b9ulqcj-shard-00-01.ba9yjkc.mongodb.net:27017,ac-b9ulqcj-shard-00-02.ba9yjkc.mongodb.net:27017/?ssl=true&replicaSet=atlas-ouys2e-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => {
        console.log("Connected to the MongoDB database successfully");
    })
    .catch((err) => {
        console.error("Database connection failed!");
        console.error("Reason:", err.message); // This will tell you if it's a login or network issue
    });

// Route Definitions
app.use("/product", productRouter);
app.use("/users", userRouter);
app.use("/order", orderRouter);
app.use("/review", reviewRouter);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});