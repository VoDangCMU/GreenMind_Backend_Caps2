import AppDataSource from "../infrastructure/database";
import { User, UserRole } from "../entity/user";
import { Household } from "../entity/household";
import { RequestHandler } from "express";
import axios from "axios";
import FormData from "form-data";
import { DETECT_TYPE, WasteDetection, STATUS } from "../entity/WasteDetection";
import { MoreThan } from "typeorm";

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
                status: STATUS.DETECTED,
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

    public AnalyzeImage: RequestHandler = async (req: any, res: any) => {
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

            const [detectResult, predictResult, massResult] = await Promise.all([
                axios.post(DETECT_TRASH_URL, createFormData(buffer, contentType), {
                    headers: { ...createFormData(buffer, contentType).getHeaders() },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }),
                axios.post(PREDICT_POLLUTANT_URL, createFormData(buffer, contentType), {
                    headers: { ...createFormData(buffer, contentType).getHeaders() },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }),
                axios.post(TOTAL_MASS_URL, createFormData(buffer, contentType), {
                    headers: { ...createFormData(buffer, contentType).getHeaders() },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                })
            ]);

            const combinedResults = {
                detect: {
                    items: detectResult.data.items,
                    totalObjects: detectResult.data.total_objects,
                    imageUrl: detectResult.data.image_url
                },
                pollutant: {
                    items: predictResult.data.items,
                    pollution: predictResult.data.pollution,
                    impact: predictResult.data.impact,
                    totalObjects: predictResult.data.total_objects,
                    imageUrl: predictResult.data.image_url
                },
                totalMass: {
                    items: massResult.data.items,
                    totalMassKg: massResult.data.total_mass_kg,
                    annotatedImageUrl: massResult.data.annotated_image_url,
                    depthMapUrl: massResult.data.depth_map_url
                }
            };

            const massMap = new Map(
                massResult.data.items.map((item: any) => [item.name.toLowerCase(), item.mass_kg])
            );
            const mergedItems = detectResult.data.items.map((item: any) => ({
                ...item,
                mass_kg: massMap.get(item.name.toLowerCase()) || null
            }));

            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: mergedItems,
                pollution: combinedResults.pollutant.pollution,
                impact: combinedResults.pollutant.impact,
                totalObjects: combinedResults.detect.totalObjects,
                totalMassKg: combinedResults.totalMass.totalMassKg,
                annotatedImageUrl: combinedResults.totalMass.annotatedImageUrl,
                depthMapUrl: combinedResults.totalMass.depthMapUrl,
                aiAnalysis: combinedResults.pollutant.imageUrl,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.ANALYZE_ALL,
                householdId: user?.householdId,
                status: STATUS.DETECTED
            });
            await WasteDetectionRepository.save(wasteDetection);

            return res.status(200).json({
                message: "Image analysis completed successfully",
                data: wasteDetection
            });
        } catch (error: any) {
            console.error("AnalyzeImage Error:", error);
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

    public markBringOut: RequestHandler = async (req: any, res: any) => {
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

            const detectionId = req.params.id;
            if (!detectionId) {
                return res.status(400).json({ error: "Detection ID is required" });
            }

            const detection = await WasteDetectionRepository.findOne({
                where: { id: detectionId, householdId: user.householdId },
                relations: { household: true }
            });

            if (!detection) {
                return res.status(404).json({ error: "Waste detection record not found" });
            }

            if (detection.detectType !== DETECT_TYPE.DETECT_TRASH) {
                return res.status(400).json({ error: "Only detections of type 'DETECT_TRASH' can be marked as brought out" });
            }
            if (detection.status === STATUS.BROUGHT_OUT) {
                return res.status(400).json({ error: "Trash has already been marked as brought out" });
            }

            if (detection.status === STATUS.PICKED_UP) {
                return res.status(400).json({ error: "Trash has already been picked up" });
            }

            detection.status = STATUS.BROUGHT_OUT;
            await WasteDetectionRepository.save(detection);

            return res.status(200).json({ message: "Trash marked as brought out", data: detection });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    public getPendingPickups: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const detections = await WasteDetectionRepository.find({
                where: { status: STATUS.BROUGHT_OUT },
                relations: { household: true, detectedBy: true },
                order: { createdAt: "DESC" }
            });

            return res.status(200).json({ message: "Pending pickups retrieved successfully", data: detections });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    public pickupWaste: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const detectionId = req.params.id;
            const imageUrl = req.body.imageUrl;

            if (!detectionId) {
                return res.status(400).json({ error: "Detection ID is required" });
            }

            if (!imageUrl) {
                return res.status(400).json({ error: "Proof image URL is required" });
            }

            const detection = await WasteDetectionRepository.findOne({
                where: { id: detectionId, status: STATUS.BROUGHT_OUT },
                relations: { household: true }
            });

            if (!detection) {
                return res.status(404).json({ error: "Waste detection record not found or not ready for pickup" });
            }

            detection.status = STATUS.PICKED_UP;
            detection.pickupProofImageUrl = imageUrl;
            detection.pickedUpAt = new Date();
            detection.collectorId = userId;
            detection.collectedBy = await UserRepository.findOne({ where: { id: userId } });

            await WasteDetectionRepository.save(detection);

            return res.status(200).json({ message: "Pickup confirmed successfully", data: detection });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
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

    public getDetectionByTypeHousehold: RequestHandler = async (req: any, res: any) => {
        try {

            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { household: true }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (!user.household) {
                return res.status(404).json({ error: "Household not found" });
            }

            const { type } = req.params;
            if (!type || !Object.values(DETECT_TYPE).includes(type as DETECT_TYPE)) {
                return res.status(400).json({ error: "Invalid detection type" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { detectType: type as DETECT_TYPE, household: { id: user.household.id } },
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

    public getAllDetections: RequestHandler = async (req: any, res: any) => {
        try {
            const detections = await WasteDetectionRepository.find({
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" },
                select: {
                    household: { id: true, address: true, lat: true, lng: true },
                    detectedBy: { id: true, fullName: true }
                }
            });
            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getAllDetectionByType: RequestHandler = async (req: any, res: any) => {
        try {
            const { type } = req.params;
            if (!type || !Object.values(DETECT_TYPE).includes(type as DETECT_TYPE)) {
                return res.status(400).json({ error: "Invalid detection type" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { detectType: type as DETECT_TYPE },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" },
                select: {
                    household: { id: true, address: true, lat: true, lng: true },
                    detectedBy: { id: true, fullName: true }
                }
            });
            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public collectorHistory: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { collectorId: userId, status: STATUS.PICKED_UP },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });

            return res.status(200).json({ message: "Collector history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getAllPickedUp: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const detections = await WasteDetectionRepository.find({
                where: { status: STATUS.PICKED_UP },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });
            return res.status(200).json({ message: "Detection history retrieved successfully", data: detections });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getMonthlyDetections: RequestHandler = async (req: any, res: any) => {
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
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const detections = await WasteDetectionRepository.find({
                where: {
                    household: { id: user.household.id },
                    createdAt: MoreThan(thirtyDaysAgo)
                },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });
            return res.status(200).json({
                message: "Monthly detections retrieved successfully",
                count: detections.length,
                data: detections
            });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getMonthlyDetectionsAdmin: RequestHandler = async (req: any, res: any) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const detections = await WasteDetectionRepository.find({
                where: { createdAt: MoreThan(thirtyDaysAgo) },
                relations: { detectedBy: true, household: true },
                order: { createdAt: "DESC" }
            });
            return res.status(200).json({
                message: "Monthly detections retrieved successfully",
                count: detections.length,
                data: detections
            });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

}
export default new DetectTrashController();