import mongoose from "mongoose"
import bcrypt from "bcryptjs";
import Admin from "../models/adminModel.js";

const connectDB = async () => {

  try {

    mongoose.connection.on('connected', () => console.log('MongoDB connection established successfully'));
    mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/esparehub")
    console.log("MongoDB Connected Successfully!")

    // Seed Super Admin if it doesn't exist
    const ownerEmail = process.env.ADMIN_EMAIL;
    const ownerPassword = process.env.ADMIN_PASSWORD;

    if (!ownerEmail || !ownerPassword) {
      console.warn("WARNING: ADMIN_EMAIL or ADMIN_PASSWORD not set in .env. Skipping Super Admin seed.");
    } else {
      const existingOwner = await Admin.findOne({ role: "owner" });
      if (!existingOwner) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ownerPassword, salt);
        await Admin.create({
          fullname: "Super Admin",
          email: ownerEmail,
          password: hashedPassword,
          role: "owner",
          status: "active"
        });
        console.log("Super Admin seeded: " + ownerEmail);
      }
    }

  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    process.exit(1)    //stop the node js server 
  }

}

export default connectDB