import { Request, Response } from "express";
import AppDataSource from "../infrastructure/database";
import { PlantAnalysis } from "../entity/plant_analysis";
import { User } from "../entity/user";
import axios from "axios";
import FormData from "form-data";

const PlantAnalysisRepo = AppDataSource.getRepository(PlantAnalysis);
const UserRepo = AppDataSource.getRepository(User);

const PLANT_ANALYZE_URL = "https://ai-greenmind.khoav4.com/analyze-image-plant";

const createFormData = (buffer: Buffer, contentType: string) => {
    const formData = new FormData();
    formData.append("file", buffer, {
        filename: "image.jpg",
        contentType
    });
    return formData;
};

class PlantAnalysisController {
    public analyzeImage = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepo.findOne({
                where: { id: userId }
            });

            const imageUrl = req.body.imageUrl;

            if (!imageUrl) {
                return res.status(400).json({ error: "Image URL is required" });
            }

            const responseURL = await axios.get(imageUrl, {
                responseType: "arraybuffer"
            });
            const buffer = Buffer.from(responseURL.data);
            const contentType = responseURL.headers["content-type"] || "application/octet-stream";

            const formData = createFormData(buffer, contentType);

            const apiResponse = await axios.post(PLANT_ANALYZE_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const { vegetable_area, dish_area, vegetable_ratio_percent, plant_image_base64 } = apiResponse.data;

            const plantAnalysis = PlantAnalysisRepo.create({
                userId,
                vegetableArea: vegetable_area,
                dishArea: dish_area,
                vegetableRatioPercent: vegetable_ratio_percent,
                plantImageUrl: plant_image_base64,
            });
            await PlantAnalysisRepo.save(plantAnalysis);

            return res.status(200).json({
                id: plantAnalysis.id,
                vegetableArea: plantAnalysis.vegetableArea,
                dishArea: plantAnalysis.dishArea,
                vegetableRatioPercent: plantAnalysis.vegetableRatioPercent,
                plantImageUrl: plantAnalysis.plantImageUrl,
                createdAt: plantAnalysis.createdAt,
            });
        } catch (error: any) {
            console.error("PlantAnalysis Error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    };

    public getAnalysisHistory = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const analyses = await PlantAnalysisRepo.find({
                where: { userId },
                order: { createdAt: "DESC" }
            });

            return res.status(200).json(analyses);
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    };
}

export default new PlantAnalysisController();