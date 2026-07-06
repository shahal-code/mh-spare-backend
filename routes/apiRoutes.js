import express from "express";
import * as apiController from "../controller/apiController.js";

const router = express.Router();

router.get("/products", apiController.getLandingProducts);
router.get("/shop", apiController.getShopProducts);
router.get("/products/:id", apiController.getProductDetails);

export default router;
