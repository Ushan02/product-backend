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
];

const sampleProducts = [
  {
    productId: "LAP-G001",
    productName: "ASUS TUF Gaming A16",
    category: "laptop",
    subCategory: "gaming",
    brand: "ASUS",
    specs: {
      processorBrand: "AMD",
      processorModel: "Ryzen 7",
      ram: 16,
      storageType: "SSD",
      storageSize: 512,
      displaySize: 16,
      gpuBrand: "NVIDIA",
      gpuModel: "RTX 4050",
    },
    altNames: ["TUF A16"],
    descriptions: "Powerful gaming laptop with RTX 4050 graphics.",
    images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400"],
    labeledPrice: 450000,
    price: 399000,
    stock: 10,
    warranty: "1 Year",
    isAvailable: true,
  },
  {
    productId: "LAP-B001",
    productName: "Dell Inspiron 15 Student",
    category: "laptop",
    subCategory: "business_and_student",
    brand: "DELL",
    specs: {
      processorBrand: "Intel",
      processorModel: "Core i5",
      ram: 8,
      storageType: "SSD",
      storageSize: 256,
      displaySize: 15.6,
      gpuBrand: null,
      gpuModel: null,
    },
    altNames: ["Inspiron 15"],
    descriptions: "Reliable laptop for business and students.",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"],
    labeledPrice: 280000,
    price: 249000,
    stock: 15,
    warranty: "1 Year",
    isAvailable: true,
  },
  {
    productId: "ACC-M001",
    productName: "Logitech Wireless Mouse",
    category: "accessories",
    subCategory: "mouse",
    brand: "LOGITECH",
    specs: {},
    altNames: ["M185"],
    descriptions: "Compact wireless mouse with long battery life.",
    images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400"],
    labeledPrice: 4500,
    price: 3500,
    stock: 50,
    warranty: "6 months",
    isAvailable: true,
  },
  {
    productId: "ACC-K001",
    productName: "Mechanical Gaming Keyboard",
    category: "accessories",
    subCategory: "keyboard",
    brand: "REDRAGON",
    specs: {},
    descriptions: "RGB mechanical keyboard for gaming setups.",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400"],
    labeledPrice: 12000,
    price: 9500,
    stock: 20,
    warranty: "6 months",
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
  console.log("Admin → admin@myapp.com / admin123");
  console.log(`Products: ${sampleProducts.length} items`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
