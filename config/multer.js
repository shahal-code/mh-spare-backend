import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";
import multer from "multer";

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "techkart/profile",
        allowed_formats: ["jpg", "jpeg", "png"],
    },
});

export const upload = multer({ storage });