import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/env';

const r2Endpoint = `https://${config.r2.accountId}.r2.cloudflarestorage.com`;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
    },
});

export async function uploadToS3(
    buffer: Buffer,
    key: string,
    mimetype: string
): Promise<string> {
    await r2Client.send(
        new PutObjectCommand({
            Bucket: config.r2.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
        })
    );
    return key;
}

export function getS3Url(key: string): string {
    if (config.r2.publicUrl) {
        return `${config.r2.publicUrl}/${key}`;
    }
    return `${r2Endpoint}/${config.r2.bucket}/${key}`;
}
