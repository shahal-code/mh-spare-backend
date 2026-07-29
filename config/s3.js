import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'missing_access_key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'missing_secret_key',
    }
});

export default s3;
