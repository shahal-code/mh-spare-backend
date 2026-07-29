import multerS3 from 'multer-s3';
import s3 from './s3.js';
import multer from 'multer';

const storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET || 'techkart-bucket',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'techkart/profile/' + uniqueSuffix + '-' + file.originalname);
    }
});



export const upload = multer({ 
    storage,
    
    limits: { fileSize: 5 * 1024 * 1024 }
});
