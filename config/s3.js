import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3Config = {
    region: process.env.AWS_REGION || 'ap-south-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const s3 = new S3Client(s3Config);

export default s3;
