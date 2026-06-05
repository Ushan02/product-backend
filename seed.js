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
    productName: "UltraBook 15 Laptop",
    category: "laptop",
    altNames: ["Ultrabook", "Business Laptop"],
    descriptions: "15-inch laptop with 16GB RAM, 512GB SSD, and all-day battery life.",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"],
    labeledPrice: 1299.99,
    price: 1099.99,
    stock: 18,
    isAvailable: true,
  },
  {
    productId: "PRD-002",
    productName: "Gaming Laptop Pro",
    category: "laptop",
    altNames: ["Gaming Notebook"],
    descriptions: "High-performance gaming laptop with RTX graphics and 144Hz display.",
    images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400"],
    labeledPrice: 1599.99,
    price: 1399.99,
    stock: 8,
    isAvailable: true,
  },
  {
    productId: "PRD-003",
    productName: "Wireless Mouse",
    category: "accessories",
    altNames: ["Bluetooth Mouse"],
    descriptions: "Ergonomic wireless mouse with silent clicks and long battery life.",
    images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400"],
    labeledPrice: 39.99,
    price: 29.99,
    stock: 42,
    isAvailable: true,
  },
  {
    productId: "PRD-004",
    productName: "Laptop Stand",
    category: "accessories",
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
    productName: "USB-C Hub",
    category: "accessories",
    altNames: ["Docking Hub"],
    descriptions: "7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader.",
    images: ["https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400"],
    labeledPrice: 59.99,
    price: 44.99,
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
