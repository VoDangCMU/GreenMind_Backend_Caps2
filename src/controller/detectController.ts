import AppDataSource from "../infrastructure/database";
import DECIMAL from "../config/schemas/Decimal";
import TEXT from "../config/schemas/Text";
import { z } from "zod";
import { In } from "typeorm";
import { User } from "../entity/user";
import { Household } from "../entity/household";
import { RequestHandler } from "express";
import axios from "axios";
import FormData from "form-data";
import { DETECT_TYPE, WasteDetection } from "../entity/WasteDetection";

interface DetectTrashResult {
    items: {
        name: string;
        quantity: number;
        area: number;
    }[];
    total_objects: number;
    image_url: string;
    pollution: Record<string, number>;
    impact: Record<string, number>;

}
const WasteDetectionRepository = AppDataSource.getRepository("WasteDetection");
const UserRepository = AppDataSource.getRepository(User);
const householdRepository = AppDataSource.getRepository(Household);
const MOCK_DATA = {
    "items": [
        {
            "name": "Plastic film",
            "quantity": 9,
            "area": 147757
        },
        {
            "name": "Single-use carrier bag",
            "quantity": 2,
            "area": 18706
        }
    ],
    "total_objects": 11,
    "image_url": "https://res.cloudinary.com/dc8q7sv1f/image/upload/v1774678190/yolo_detect/detect/d11639b05dd24f4b967b03e2d7f31c8c.jpg",
    "pollution": {
        "CO2": 0.6931471805569416,
        "microplastic": 0.6931471805569416,
        "dioxin": 0.5365526341607301,
        "non_biodegradable": 0.6931471805569416,
        "CH4": 0.0,
        "PM2.5": 0.0,
        "NOx": 0.0,
        "SO2": 0.0,
        "Pb": 0.0,
        "Hg": 0.0,
        "Cd": 0.0,
        "nitrate": 0.0,
        "chemical_residue": 0.0,
        "toxic_chemicals": 0.0,
        "styrene": 0.0
    },
    "impact": {
        "air_pollution": 1.2296998147176716,
        "water_pollution": 0.6931471805569416,
        "soil_pollution": 1.3862943611138832
    }
}

const PREDICT_POLLUTANT_URL = "https://ai-greenmind.khoav4.com/predict-pollutant-impact";
const DETECT_TRASH_URL = "https://ai-greenmind.khoav4.com/detect-trash";
export class DetectTrashController {

    public DetectTrashOnly: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { household: true }
            });

            const imageUrl = req.body.imageUrl;

            if (!imageUrl) {
                return res.status(400).json({ error: "Image URL is required" });
            }

            const responseURL = await axios.get(imageUrl, {
                responseType: "stream"
            });

            const formData = new FormData();
            formData.append("file", responseURL.data as any, {
                filename: "image.jpg",
                contentType: responseURL.headers["content-type"]
            });

            const result = await axios.post(DETECT_TRASH_URL, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: result.data.items,
                totalObjects: result.data.total_objects,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.DETECT_TRASH,
                householdId: user?.householdId,
                aiAnalysis: result.data.image_url,
            });
            await WasteDetectionRepository.save(wasteDetection);

            return res.status(200).json({ message: "Waste detection successful", data: wasteDetection });
        } catch (error: any) {
            console.error("DetectTrashOnly error:", error?.response?.data ?? error?.message ?? error);
            if (error?.response?.status) {
                return res.status(error.response.status).json({ error: error.response.data || "External API error" });
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public PredictPollutantImpact: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { household: true }
            });

            const imageUrl = req.body.imgURL || req.body.imageUrl;

            if (!imageUrl) {
                return res.status(400).json({ error: "Image URL is required" });
            }

            const responseURL = await axios.get(imageUrl, {
                responseType: "stream"
            });

            const formData = new FormData();
            formData.append("file", responseURL.data as any, {
                filename: "image.jpg",
                contentType: responseURL.headers["content-type"]
            });

            const result = await axios.post(PREDICT_POLLUTANT_URL, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: result.data.items,
                pollution: result.data.pollution,
                impact: result.data.impact,
                totalObjects: result.data.total_objects,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.PREDICT_POLLUTANT,
                householdId: user?.householdId,
                aiAnalysis: result.data.image_url,
            });
            await WasteDetectionRepository.save(wasteDetection);

            const createdDetection = await WasteDetectionRepository.findOne({
                where: { id: wasteDetection.id },
                relations: {
                    detectedBy: true,
                    household: true
                }
            });
            return res.status(200).json({ message: "Waste detection successful", data: createdDetection });
        } catch (error: any) {
            res.status(500).json({ error: "Internal server error" });
        };
    }

    public getDetectionHistoryByUser: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { household: true }
            });
            if (!user || !user.household) {
                return res.status(404).json({ error: "Household not found" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { detectedBy: { id: userId } },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });
            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getDetectionHistoryByHousehold: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { household: true }
            });
            if (!user || !user.household) {
                return res.status(404).json({ error: "Household not found" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { household: { id: user.householdId } },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });
            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getAllDetectionsByHousehold: RequestHandler = async (req: any, res: any) => {
        try {
            const detections = await WasteDetectionRepository.find({
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });
            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getHouseholdById: RequestHandler = async (req: any, res: any) => {
        try {
            const householdId = req.params.id;
            if (!householdId) {
                return res.status(400).json({ error: "Household ID is required" });
            }

            const household = await householdRepository.findOne({
                where: { id: householdId },
                relations: { members: true }
            });
            if (!household) {
                return res.status(404).json({ error: "Household not found" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { household: { id: householdId } },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });

            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}
export default new DetectTrashController();