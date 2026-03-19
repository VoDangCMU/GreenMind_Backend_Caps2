import { Router } from "express";
import ocrController from "../controller/ocrController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    }
});

router.post("/", jwtAuthMiddleware, upload.single('file'), ocrController.processOCR);

router.get("/invoices", jwtAuthMiddleware, ocrController.getInvoices);

export default router;