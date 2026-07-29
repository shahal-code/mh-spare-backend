import multerS3 from 'multer-s3';
import s3 from './s3.js';
import multer from 'multer';

const storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET || 'mhspare-admin-2026',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'offers/' + uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG, WEBP, and AVIF are allowed."), false);
    }
};

export const uploadOffer = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
