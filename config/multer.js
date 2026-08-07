import multer from 'multer';
import { getStorage } from './storageHelper.js';

const storage = getStorage('profile');

export const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});
