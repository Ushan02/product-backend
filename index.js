import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import cors from "cors";


import productRouter from './routes/productrouter.js';
import userRouter from './routes/userrouter.js';
import orderRouter from './routes/orderrouter.js';
import reviewRouter from './routes/reviewrouter.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());


app.use((req, res, next) => {
    const tokenString = req.header("Authorization");
    
    if (tokenString) {

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
       
        next();
    }
});


const mongoURI = "mongodb://admin:1234@ac-b9ulqcj-shard-00-00.ba9yjkc.mongodb.net:27017,ac-b9ulqcj-shard-00-01.ba9yjkc.mongodb.net:27017,ac-b9ulqcj-shard-00-02.ba9yjkc.mongodb.net:27017/?ssl=true&replicaSet=atlas-ouys2e-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(mongoURI)
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