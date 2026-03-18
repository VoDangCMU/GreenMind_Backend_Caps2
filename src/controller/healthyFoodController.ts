import { Request, Response, RequestHandler } from "express";
import axios from "axios";
import FormData from "form-data";

interface HealthyFoodResponse {
    vegetable_area: number;
    dish_area: number;
    vegetable_ratio_percent: number;
    plant_image_base64: string;
}

class HealthyFoodController {
    /**
     * Analyze image for healthy food ratio
     * POST /api/healthy-food-ratio
     * Body: multipart/form-data with file field
     */
    public analyzeHealthyFood: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: "File is required" });
            return;
        }

        try {
            // Create FormData for API request
            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            // Call AI API
            const response = await axios.post<HealthyFoodResponse>(
                'https://ai-greenmind.khoav4.com/analyze-image-plant',
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    }
                }
            );

            const result = response.data;

            // Return the exact response from AI API
            res.status(200).json(result);
        } catch (error) {

            if (axios.isAxiosError(error)) {
                res.status(error.response?.status || 500).json({
                    message: "Healthy food analysis failed",
                    error: error.response?.data || error.message
                });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };
}

export default new HealthyFoodController();