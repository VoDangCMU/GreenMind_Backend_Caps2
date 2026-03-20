import { Router } from 'express';
import multer from 'multer';
import { jwtAuthMiddleware } from '../middlewares/jwtMiddleware';
import mediaController from '../controller/mediaController';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    },
});

router.post('/upload', jwtAuthMiddleware, upload.single('file'), mediaController.uploadBillImage);

export default router;
