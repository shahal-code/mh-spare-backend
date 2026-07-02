import express from "express";
import adminApiRoutes from "./adminApiRoutes.js";

const router = express.Router();

// Mount the admin API routes
router.use("/api", adminApiRoutes);

export default router;
