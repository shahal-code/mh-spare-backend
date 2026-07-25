import express from "express";
import superadminApiRoutes from "./superadminApiRoutes.js";
import vendorApiRoutes from "./vendorApiRoutes.js";

const router = express.Router();

router.use("/api/superadmin", superadminApiRoutes);
router.use("/api/vendor", vendorApiRoutes);

export default router;
