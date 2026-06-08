import express from 'express';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import cors from "cors";
import productRouter from './routes/productrouter.js';
import userRouter from './routes/userrouter.js';
import orderRouter from './routes/orderrouter.js';
import reviewRouter from './routes/reviewrouter.js';
import contactRouter from './routes/contactrouter.js';
import paymentRouter from './routes/paymentrouter.js';
import dotenv from 'dotenv';
import { verifySmtpConnection } from './lib/email.js';
import { getPaymentSettings } from './lib/paymentConfig.js';
import { isGoogleAuthConfigured, getGoogleClientId } from './lib/googleAuth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const { frontendUrl } = getPaymentSettings();
const corsOrigins = [...new Set([frontendUrl, "http://localhost:5173"].filter(Boolean))];

app.use(
  cors({
    origin: corsOrigins,
  })
);
app.use(express.json());  // use built-in express.json() — body-parser v2 breaks on Express 5

// JWT middleware — decode token if present; never block unauthenticated requests here
app.use((req, res, next) => {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
        return next();  // no token — continue as guest
    }

    const token = authHeader.replace("Bearer ", "");

    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        // Token is present but invalid/expired — reject the request
        return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
    }
});

mongoose.connect(process.env.MONGO_URL)
    .then(async () => {
        console.log("Connected to MongoDB successfully");
        await verifySmtpConnection();
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
    });

// Routes
app.use("/api/products", productRouter);
app.use("/api/users",    userRouter);
app.use("/api/order",    orderRouter);
app.use("/api/review",   reviewRouter);
app.use("/api/contact",  contactRouter);
app.use("/api/payment",  paymentRouter);

app.listen(PORT, () => {
    const payment = getPaymentSettings();
    console.log(`Server running on port ${PORT}`);
    console.log(`Payment mode: ${payment.mode}${payment.mode === "stripe" ? " (Stripe)" : " (Cash on Delivery)"}`);
    if (isGoogleAuthConfigured()) {
        console.log(`Google OAuth: configured (${getGoogleClientId().slice(0, 20)}...)`);
    } else {
        console.warn("Google OAuth: GOOGLE_CLIENT_ID missing — Google login will fail on server.");
    }
    console.log(`CORS origins: ${corsOrigins.join(", ")}`);
});