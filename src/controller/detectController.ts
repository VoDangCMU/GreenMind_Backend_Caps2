import AppDataSource from "../infrastructure/database";
import { User } from "../entity/user";
import { Household } from "../entity/household";
import { RequestHandler } from "express";
import axios from "axios";
import FormData from "form-data";
import { DETECT_TYPE, WasteDetection } from "../entity/WasteDetection";

const WasteDetectionRepository = AppDataSource.getRepository("WasteDetection");
const UserRepository = AppDataSource.getRepository(User);
const householdRepository = AppDataSource.getRepository(Household);

const PREDICT_POLLUTANT_URL = "https://ai-greenmind.khoav4.com/predict-pollutant-impact";
const DETECT_TRASH_URL = "https://ai-greenmind.khoav4.com/detect-trash";
const TOTAL_MASS_URL = "https://ai-greenmind.khoav4.com/total-mass";

const createFormData = (buffer: Buffer, contentType: string) => {
    const formData = new FormData();
    formData.append("file", buffer, {
        filename: "image.jpg",
        contentType
    });
    return formData;
};

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
                responseType: "arraybuffer"
            });
            const buffer = Buffer.from(responseURL.data);
            const contentType = responseURL.headers["content-type"] || "application/octet-stream";

            const detectFormData = createFormData(buffer, contentType);

            const result = await axios.post(DETECT_TRASH_URL, detectFormData, {
                headers: {
                    ...detectFormData.getHeaders(),
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
                responseType: "arraybuffer"
            });
            const buffer = Buffer.from(responseURL.data);
            const contentType = responseURL.headers["content-type"] || "application/octet-stream";

            const predictFormData = createFormData(buffer, contentType);

            const result = await axios.post(PREDICT_POLLUTANT_URL, predictFormData, {
                headers: {
                    ...predictFormData.getHeaders()
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

    public TotalMass: RequestHandler = async (req: any, res: any) => {
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
                responseType: "arraybuffer"
            });
            const buffer = Buffer.from(responseURL.data);
            const contentType = responseURL.headers["content-type"] || "application/octet-stream";
            const formData = createFormData(buffer, contentType);
            const result = await axios.post(TOTAL_MASS_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: result.data.items,
                totalMassKg: result.data.total_mass_kg,
                annotatedImageUrl: result.data.annotated_image_url,
                depthMapUrl: result.data.depth_map_url,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.TOTAL_MASS,
                householdId: user?.householdId
            });
            await WasteDetectionRepository.save(wasteDetection);
            return res.status(200).json({ message: "Total mass estimation successful", data: wasteDetection });
        } catch (error: any) {
            res.status(500).json({ error: "Internal server error" });
        }
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

    public getDetectionByType: RequestHandler = async (req: any, res: any) => {
        try {
            const { type } = req.params;
            if (!type || !Object.values(DETECT_TYPE).includes(type as DETECT_TYPE)) {
                return res.status(400).json({ error: "Invalid detection type" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { detectType: type as DETECT_TYPE },
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