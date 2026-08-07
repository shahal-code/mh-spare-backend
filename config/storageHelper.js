import fs from 'fs';
import path from 'path';
import multer from 'multer';
import multerS3 from 'multer-s3';
import s3 from './s3.js';

export const getStorage = (folder) => {
    if (process.env.NODE_ENV === 'production') {
        return multerS3({
            s3: s3,
            bucket: process.env.AWS_S3_BUCKET || 'mhspare-admin-2026',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: function (req, file, cb) {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, `${folder}/` + uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
            }
        });
    }

    // Local Disk Storage for Development
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    return multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const safeName = file.originalname.replace(/\s+/g, '-');
            const filename = uniqueSuffix + '-' + safeName;
            // Attach location property so controllers get the relative URL
            file.location = `/uploads/${folder}/${filename}`;
            cb(null, filename);
        }
    });
};
