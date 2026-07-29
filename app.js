import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";
import cors from "cors";
import passport from "passport";
import './config/passport.js';
import * as ErrorHandler from "./middleware/errorHandler.js";
import { userContext } from "./middleware/userAuth.js";
import { preventCache } from "./middleware/commonMiddleware.js";
const app = express();

import bcrypt from "bcryptjs";
import Admin from "./models/adminModel.js";

connectDB().then(async () => {
  // Seed Super Admin if it doesn't exist
  const ownerEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const ownerPassword = process.env.ADMIN_PASSWORD || "12345";
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
});
const splitOrigins = (val, fallback) =>
  (val || fallback).split(",").map(u => u.trim()).filter(Boolean);

const allowedOrigins = [
  ...splitOrigins(process.env.FRONTEND_URL, "http://localhost:5173"),
  ...splitOrigins(process.env.VENDOR_URL || process.env.ADMIN_URL, "http://localhost:5174"),
  ...splitOrigins(process.env.SUPERADMIN_URL, "http://localhost:5175"),
];
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.devtunnels.ms') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    console.error("CORS Blocked Origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Welcome to MH-Spare API" });
});

app.use("/api", apiRoutes);

app.use(preventCache);

app.use(passport.initialize());

//user routes
app.use("/user", userContext, userRoutes);
//admin routes
app.use("/admin", adminRoutes);
// Error Handling Middleware
app.use(ErrorHandler.notFound);
app.use(ErrorHandler.globalErrorHandler);

//PORT

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

