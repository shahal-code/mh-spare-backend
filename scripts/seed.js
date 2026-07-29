import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import Admin from "../models/adminModel.js";

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techkart");
        console.log("MongoDB Connected for Seeding");

        // 1. Get Super Admin
        const admin = await Admin.findOne({ role: "owner" });
        if (!admin) {
            console.error("Super Admin not found. Run the main app.js once first to seed the admin.");
            process.exit(1);
        }

        // 2. Seed Category
        let category = await Category.findOne({ name: "Laptops" });
        if (!category) {
            category = await Category.create({
                name: "Laptops",
                description: "High performance laptops",
                url_slug: "laptops",
                is_blocked: false,
            });
            console.log("Seeded Category:", category.name);
        } else {
            console.log("Category already exists:", category.name);
        }

        // 3. Seed Product
        const productExists = await Product.findOne({ name: "MacBook Pro M3" });
        if (!productExists) {
            await Product.create({
                adminId: admin._id,
                approvalStatus: 'approved',
                name: "MacBook Pro M3",
                description: "The latest Apple MacBook Pro with M3 chip.",
                category_id: category._id,
                is_blocked: false,
                is_unlisted: false,
                thumbnail: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
                variants: [
                    {
                        size: "14-inch",
                        processorBrand: "Intel", 
                        processor: "i7",
                        ram: "16GB",
                        storage: "512GB",
                        color: "Space Black",
                        price: 159900,
                        stock: 10,
                        images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80"],
                        sku: "MBP-M3-14",
                        is_blocked: false
                    }
                ]
            });
            console.log("Seeded Product: MacBook Pro M3");
        } else {
            console.log("Product already exists: MacBook Pro M3");
        }

        console.log("Database Seeding Completed Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();
