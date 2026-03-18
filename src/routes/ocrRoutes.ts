import { Router } from "express";
import ocrController from "../controller/ocrController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import multer from "multer";

const router = Router();

// Configure multer for file upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    }
});

// POST /api/ocr - Process OCR from image
router.post("/", jwtAuthMiddleware, upload.single('file'), ocrController.processOCR);

// GET /api/invoices - Get all invoices for authenticated user
router.get("/invoices", jwtAuthMiddleware, ocrController.getInvoices);

export default router;