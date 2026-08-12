import multer from 'multer';
import { getStorage } from './storageHelper.js';

const storage = getStorage('kyc');

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only image files (JPG, PNG, WEBP, AVIF) are allowed. PDF files are not accepted."), false);
    }
};

export const uploadKyc = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
