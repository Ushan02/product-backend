import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import Users from "./models/Users.js";
import Product from "./models/product.js";

dotenv.config();

const sampleUsers = [
  {
    email: "admin@myapp.com",
    firstName: "Admin",
    lastName: "User",
    password: "admin123",
    role: "admin",
    isBlock: false,
  },
  {
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
    password: "user123",
    role: "customer",
    isBlock: false,
  },
  {
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Smith",
    password: "user123",
    role: "customer",
    isBlock: false,
  },
];

const sampleProducts = [
  {
    productId: "PRD-001",
    productName: "Wireless Headphones",
    altNames: ["BT Headphones", "Wireless Earphones"],
    descriptions: "Noise-cancelling over-ear headphones with 30-hour battery life.",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"],
    labeledPrice: 99.99,
    price: 79.99,
    stock: 45,
    isAvailable: true,
  },
  {
    productId: "PRD-002",
    productName: "Running Shoes",
    altNames: ["Sports Shoes"],
    descriptions: "Lightweight running shoes with breathable mesh upper.",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400"],
    labeledPrice: 79.99,
    price: 59.99,
    stock: 12,
    isAvailable: true,
  },
  {
    productId: "PRD-003",
    productName: "Coffee Mug",
    altNames: ["Ceramic Mug"],
    descriptions: "350ml ceramic mug, dishwasher and microwave safe.",
    images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400"],
    labeledPrice: 18.99,
    price: 12.99,
    stock: 3,
    isAvailable: true,
  },
  {
    productId: "PRD-004",
    productName: "Laptop Stand",
    altNames: ["Aluminum Stand"],
    descriptions: "Adjustable aluminum laptop stand for better ergonomics.",
    images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400"],
    labeledPrice: 49.99,
    price: 34.99,
    stock: 0,
    isAvailable: false,
  },
  {
    productId: "PRD-005",
    productName: "Yoga Mat",
    altNames: ["Exercise Mat"],
    descriptions: "Non-slip yoga mat, 6mm thick, includes carrying strap.",
    images: ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400"],
    labeledPrice: 34.99,
    price: 24.99,
    stock: 28,
    isAvailable: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB");

  await Users.deleteMany({});
  await Product.deleteMany({});

  const users = sampleUsers.map((u) => ({
    ...u,
    password: bcrypt.hashSync(u.password, 10),
  }));
  await Users.insertMany(users);

  await Product.insertMany(sampleProducts);

  console.log("\n✅ Sample data inserted!\n");
  console.log("Login endpoint: POST http://localhost:5000/api/users/login\n");
  console.log("Accounts:");
  console.log("  Admin    → admin@myapp.com  / admin123");
  console.log("  Customer → john@example.com  / user123");
  console.log("  Customer → jane@example.com  / user123");
  console.log(`\nProducts: ${sampleProducts.length} items inserted.`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
