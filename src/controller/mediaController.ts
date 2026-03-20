import { Request, Response, RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { uploadToS3, getS3Url } from '../utils/s3Helper';

class MediaController {
    public uploadBillImage: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'File is required' });
            return;
        }

        const ext = req.file.originalname.split('.').pop();
        const imageKey = `bills/${userId}/${randomUUID()}.${ext}`;

        const key = await uploadToS3(req.file.buffer, imageKey, req.file.mimetype);

        res.status(200).json({
            imageKey: key,
            imageUrl: getS3Url(key),
        });
    };
}

export default new MediaController();
