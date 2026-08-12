import multer from 'multer';
import { getStorage } from './storageHelper.js';

const storage = getStorage('products');

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG, WEBP, and AVIF are allowed."), false);
    }
};

export const uploadProduct = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
});
