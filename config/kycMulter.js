import multer from 'multer';
import { getStorage } from './storageHelper.js';

const storage = getStorage('kyc');

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG, WEBP, AVIF and PDF are allowed."), false);
    }
};

export const uploadKyc = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
