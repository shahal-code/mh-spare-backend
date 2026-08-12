import multer from 'multer';
import { getStorage } from './storageHelper.js';

const storage = getStorage('brands');

export const uploadBrand = multer({ 
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }
});
