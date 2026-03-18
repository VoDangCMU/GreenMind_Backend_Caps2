import { Router } from "express";
import healthyFoodController from "../controller/healthyFoodController";
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

// POST /api/healthy-food-ratio - Analyze image for healthy food ratio
router.post("/", jwtAuthMiddleware, upload.single('file'), healthyFoodController.analyzeHealthyFood);

export default router;
