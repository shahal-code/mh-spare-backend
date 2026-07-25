import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Banner from './models/bannerModel.js';

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        await Banner.deleteMany({}); // Delete existing banners
        console.log("Deleted old banners.");

        const banner1 = new Banner({
            title: "Disassembled Tech (Default)",
            tagline: "Genuine Electronic Parts",
            headline: "Premium Spares.<br/><span class=\"text-primary\">Perfect Repairs.</span>",
            subtitle: "Source top-quality batteries, screens, and components for all major brands. Built for technicians and DIYers who refuse to compromise.",
            image: "/banners/hero-a.png",
            isActive: true,
            order: 1
        });

        const banner2 = new Banner({
            title: "Repair Tools Flat-lay",
            tagline: "Genuine Electronic Parts",
            headline: "Premium Spares.<br/><span class=\"text-primary\">Perfect Repairs.</span>",
            subtitle: "Source top-quality batteries, screens, and components for all major brands. Built for technicians and DIYers who refuse to compromise.",
            image: "/banners/hero-b.png",
            isActive: true,
            order: 2
        });

        await banner1.save();
        await banner2.save();

        console.log("Seeded banners successfully.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
