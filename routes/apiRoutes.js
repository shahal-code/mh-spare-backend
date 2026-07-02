import express from "express";
import * as apiController from "../controller/apiController.js";

const router = express.Router();

router.get("/products", apiController.getLandingProducts);

export default router;
