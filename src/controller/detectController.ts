import AppDataSource from "../infrastructure/database";
import { User, UserRole } from "../entity/user";
import { Household } from "../entity/household";
import { RequestHandler } from "express";
import axios from "axios";
import FormData from "form-data";
import { DETECT_TYPE, WasteDetection, STATUS } from "../entity/WasteDetection";
import { MoreThan } from "typeorm";
import { GreenScore } from "../entity/greenScore";

const WasteDetectionRepository = AppDataSource.getRepository("WasteDetection");
const UserRepository = AppDataSource.getRepository(User);
const householdRepository = AppDataSource.getRepository(Household);
const greenScoreRepository = AppDataSource.getRepository(GreenScore);

const PREDICT_POLLUTANT_URL = "https://ai-greenmind.khoav4.com/predict-pollutant-impact";
const DETECT_TRASH_URL = "https://ai-greenmind.khoav4.com/detect-trash";
const TOTAL_MASS_URL = "https://ai-greenmind.khoav4.com/total-mass";
const SEGMENT_URL = "https://ai-greenmind.khoav4.com/detect-trash-ver2";
const AI_SCORE_URL = "https://ai-greenmind.khoav4.com/score";

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

            const detectResult = await axios.post(DETECT_TRASH_URL, detectFormData, {
                headers: {
                    ...detectFormData.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: detectResult.data.items,
                totalObjects: detectResult.data.total_objects,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.DETECT_TRASH,
                status: STATUS.DETECTED,
                householdId: user?.householdId,
                aiAnalysis: detectResult.data.image_url,
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

            const predictResult = await axios.post(PREDICT_POLLUTANT_URL, predictFormData, {
                headers: {
                    ...predictFormData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: predictResult.data.items,
                pollution: predictResult.data.pollution,
                impact: predictResult.data.impact,
                totalObjects: predictResult.data.total_objects,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.PREDICT_POLLUTANT,
                householdId: user?.householdId,
                aiAnalysis: predictResult.data.image_url,
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

            const massResult = await axios.post(TOTAL_MASS_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                items: massResult.data.items,
                totalMassKg: massResult.data.total_mass_kg,
                annotatedImageUrl: massResult.data.annotated_image_url,
                depthMapUrl: massResult.data.depth_map_url,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.TOTAL_MASS,
                householdId: user?.householdId,
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

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const imageUrl = req.body.imageUrl;

            if (!imageUrl) {
                return res.status(400).json({ error: "Image URL is required" });
            }

            const responseURL = await axios.get(imageUrl, {
                responseType: "arraybuffer"
            });
            const buffer = Buffer.from(responseURL.data);
            const contentType = responseURL.headers["content-type"] || "application/octet-stream";
            const segmentResult = await axios.post(SEGMENT_URL, createFormData(buffer, contentType), {
                headers: { ...createFormData(buffer, contentType).getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const wasteDetection = WasteDetectionRepository.create({
                imageUrl: imageUrl,
                segments: segmentResult.data.grouped,
                detectedBy: user,
                household: user?.household,
                detectType: DETECT_TYPE.ANALYZE_ALL,
                householdId: user?.householdId,
                status: STATUS.DETECTED,
                aiAnalysis: segmentResult.data.image_url
            });
            await WasteDetectionRepository.save(wasteDetection);
            res.status(200).json({ message: "Image analysis successful", data: wasteDetection });
            const detectResult = await axios.post(DETECT_TRASH_URL, createFormData(buffer, contentType), {
                headers: { ...createFormData(buffer, contentType).getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            wasteDetection.items = detectResult.data.items;
            wasteDetection.totalObjects = detectResult.data.total_objects;
            await WasteDetectionRepository.save(wasteDetection);

            const predictResult = await axios.post(PREDICT_POLLUTANT_URL, createFormData(buffer, contentType), {
                headers: { ...createFormData(buffer, contentType).getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            wasteDetection.pollution = predictResult.data.pollution;
            wasteDetection.impact = predictResult.data.impact;
            await WasteDetectionRepository.save(wasteDetection);

            const massResult = await axios.post(TOTAL_MASS_URL, createFormData(buffer, contentType), {
                headers: { ...createFormData(buffer, contentType).getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            const massMap = new Map(
                massResult.data.items.map((item: any) => [item.name.toLowerCase(), item.mass_kg])
            );
            const mergedItems = wasteDetection.items.map((item: any) => ({
                ...item,
                mass_kg: massMap.get(item.name.toLowerCase()) || null
            }));
            wasteDetection.items = mergedItems;
            wasteDetection.totalMassKg = massResult.data.total_mass_kg;
            wasteDetection.annotatedImageUrl = massResult.data.annotated_image_url;
            wasteDetection.depthMapUrl = massResult.data.depth_map_url;
            const savedDetection = await WasteDetectionRepository.save(wasteDetection);

            let currentScore;
            const greenScore = await greenScoreRepository.findOne({
                where: { householdId: user.householdId },
                order: { createdAt: "DESC" },
                relations: { household: true }
            });
            if (greenScore) {
                currentScore = greenScore.finalScore;
            } else {
                currentScore = 50;
            }

            const aiResult = await axios.post(AI_SCORE_URL, {
                current_score: currentScore,
                items: detectResult.data.items,
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!aiResult) {
                return res.status(500).json({ message: "Failed to calculate green score" });
            }

            const { delta, final_score, reasons } = aiResult.data;

            const newGreenScore = greenScoreRepository.create({
                previousScore: currentScore,
                delta: delta,
                finalScore: final_score,
                householdId: user.householdId,
                household: user.household ?? undefined,
                items: wasteDetection.items,
                reasons: reasons,
                wasteDetection: savedDetection,
                wasteDetectionId: savedDetection.id
            });
            wasteDetection.greenScoreId = newGreenScore.id;
            await WasteDetectionRepository.save(wasteDetection);
            return await greenScoreRepository.save(newGreenScore);

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
                relations: { detectedBy: true, household: true, greenScore: true },
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
                relations: { detectedBy: true, household: true, greenScore: true },
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

    public SaveDetection: RequestHandler = async (req: any, res: any) => {
        try {
            const { userId, householdId } = req.body;
            if (!userId || !householdId) {
                return res.status(400).json({ error: "userId and householdId are required" });
            }

            const user = await UserRepository.findOne({
                where: { id: userId },
                relations: { household: true }
            });

            const household = await householdRepository.findOne({
                where: { id: householdId }
            });

            if (!user || !household) {
                return res.status(404).json({ error: "User or household not found" });
            }
            const mockData = {
                imageUrl: "https://greenmind-bucket.khoav4.com/uploads/22859d5c-5942-4d2e-9fe3-0cbf4bca44ae/662328838_1204943478172377_3467340833683000428_n.jpg",
                items: [
                    { area: 9759, name: "Drink can", mass_kg: 0.0471, quantity: 3 },
                    { area: 16029, name: "Clear plastic bottle", mass_kg: 0.0208, quantity: 3 },
                    { area: 5749, name: "Foam food container", mass_kg: 0.014, quantity: 1 },
                    { area: 3692, name: "Other plastic wrapper", mass_kg: 0.0091, quantity: 1 },
                    { area: 55659, name: "Plastic film", mass_kg: 5.1417, quantity: 1 },
                    { area: 17937, name: "Crisp packet", mass_kg: null, quantity: 1 },
                    { area: 1807, name: "Styrofoam piece", mass_kg: null, quantity: 1 }
                ],
                pollution: {
                    Cd: 0, Hg: 0, Pb: 0, CH4: 0, CO2: 0.678, NOx: 0.192, "SO2": 0.192,
                    "PM2.5": 0, dioxin: 0.637, nitrate: 0, styrene: 0.209,
                    microplastic: 0.675, toxic_chemicals: 0.268, chemical_residue: 0, non_biodegradable: 0.675
                },
                segments: {
                    residual: ["https://res.cloudinary.com/dc8q7sv1f/image/upload/v1778938934/yolo_segments/segments/5151e707e75942c784c5caf5d4fd6081.png"],
                    recyclable: ["https://res.cloudinary.com/dc8q7sv1f/image/upload/v1778938930/yolo_segments/segments/c1d3f7235da44203994aaeb0e4b43bec.png"]
                },
                impact: { air_pollution: 0.283, soil_pollution: 0.305, water_pollution: 0.113 },
                totalObjects: 11,
                totalMassKg: 5.2327,
                annotatedImageUrl: "https://res.cloudinary.com/dc8q7sv1f/image/upload/v1778938947/yolo_mass_detect/mass_detect/55bf2f298ef74df9af20a39aff59dfcc.jpg",
                depthMapUrl: "https://res.cloudinary.com/dc8q7sv1f/image/upload/v1778938950/yolo_depth_maps/depth_map/b0f8dd423f734755884f3d851ab9e725.png",
                aiAnalysis: "https://res.cloudinary.com/dc8q7sv1f/image/upload/v1778938942/yolo_detect/detect/b44d052a15d74e55a965d43397ff83b5.jpg",
                detectType: DETECT_TYPE.ANALYZE_ALL,
                status: STATUS.BROUGHT_OUT,
            };

            const wasteDetection = WasteDetectionRepository.create({
                ...mockData,
                detectedBy: user,
                household: household,
                householdId: householdId,
            });

            await WasteDetectionRepository.save(wasteDetection);

            return res.status(200).json({ message: "Detection saved successfully", data: wasteDetection });
        } catch (error: any) {
            console.error("SaveDetection Error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

}
export default new DetectTrashController();