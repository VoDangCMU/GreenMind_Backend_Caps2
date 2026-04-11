import { RequestHandler } from "express";
import { GreenScore } from "../entity/greenScore";
import AppDataSource from "../infrastructure/database";
import { DETECT_TYPE, WasteDetection } from "../entity/WasteDetection";
import { User } from "../entity/user";
import axios from "axios";
import { tr } from "zod/v4/locales";
import { Household } from "../entity/household";

const userRepository = AppDataSource.getRepository(User);
const wasteDetectionRepository = AppDataSource.getRepository(WasteDetection);
const greenScoreRepository = AppDataSource.getRepository(GreenScore);
const AI_URL = "https://ai-greenmind.khoav4.com/score"
class GreenScoreController {
    public submitGreenScore: RequestHandler = async (req, res) => {
        try {

            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const detectId = req.params.detectId;

            if (!detectId) {
                return res.status(400).json({ message: "detectId is required" });
            }

            const [user, detect] = await Promise.all([
                userRepository.findOne({ where: { id: userId }, relations: ["household"] }),
                wasteDetectionRepository.findOne({ where: { id: detectId }, relations: ["household"] })
            ])

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (!detect) {
                return res.status(404).json({ message: "Waste detection not found" });
            }

            if (detect.detectType !== DETECT_TYPE.DETECT_TRASH) {
                return res.status(400).json({ message: "Just detect trash only can be submitted for green score calculation" });
            }

            if (detect.householdId !== user.householdId) {
                return res.status(403).json({ message: "User does not belong to the same household as the waste detection" });
            }

            if (!user.household) {
                return res.status(400).json({ message: "User does not belong to a household" });
            }

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

            const aiResult = await axios.post(AI_URL, {
                current_score: currentScore,
                items: detect.items,
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
                household: user.household,
                items: detect.items,
                reasons: reasons,
            });

            await greenScoreRepository.save(newGreenScore);
            return res.status(200).json({
                message: "Green score calculated successfully",
                data: newGreenScore
            });

        } catch (error: any) {
            res.status(500).json({ message: "Internal server error", error: error?.message });
        }
    }

    public getGreenScoreHistory: RequestHandler = async (req, res) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await userRepository.findOne({ where: { id: userId }, relations: ["household"] });
            if (!user || !user.household) {
                return res.status(404).json({ message: "User not found or Household not found" });
            }
            const greenScores = await greenScoreRepository.find({
                where: { householdId: user.householdId },
                order: { createdAt: "DESC" },
                relations: { household: true }
            });
            return res.status(200).json({
                message: "Green score history retrieved successfully",
                data: greenScores
            });
        } catch (error: any) {
            res.status(500).json({ message: "Internal server error", detail: error?.message });
        }
    }

    public deleteGreenScores: RequestHandler = async (req, res) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await userRepository.findOne({ where: { id: userId }, relations: ["household"] });
            if (!user || !user.household) {
                return res.status(404).json({ message: "User not found or Household not found" });
            }
            await greenScoreRepository.delete({ householdId: user.householdId });

            await greenScoreRepository.save(greenScoreRepository.create({
                previousScore: 50,
                delta: 0,
                finalScore: 50,
                householdId: user.householdId,
                household: user.household
            }));
            return res.status(200).json({
                message: "Green scores deleted successfully",
            });
        } catch (error: any) {
            res.status(500).json({ message: "Internal server error", detail: error?.message });
        }
    }

    public getGreenScoreByHousehold: RequestHandler = async (req, res) => {
        try {
            const householdId = req.params.householdId;
            if (!householdId) {
                return res.status(400).json({ message: "Household ID is required" });
            }
            const holdhousehold = await AppDataSource.getRepository(Household).findOne({
                where: { id: householdId },
                relations: {
                    greenScores: true
                }
            });
            if (!holdhousehold) {
                return res.status(404).json({ message: "Household not found" });
            }
            res.status(200).json({
                message: "Green score retrieved successfully",
                data: holdhousehold
            });

        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}


export default new GreenScoreController();