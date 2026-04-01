import AppDataSource from "../infrastructure/database";
import DECIMAL from "../config/schemas/Decimal";
import TEXT from "../config/schemas/Text";
import { z } from "zod";
import { In } from "typeorm";
import { User } from "../entity/user";
import { Household } from "../entity/household";
import e, { RequestHandler } from "express";
const HouseholdParamsSchema = z.object({
    address: TEXT,
    lat: DECIMAL,
    lng: DECIMAL,
    userId: z.array(z.string().uuid("Invalid user ID")).min(1, "At least one user ID is required"),
});

const UpdateHouseholdParamsSchema = z.object({
    address: TEXT.optional(),
    lat: DECIMAL.optional(),
    lng: DECIMAL.optional(),
    userId: z.array(z.string().uuid("Invalid user ID")).optional(),
});
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
export class HouseholdController {

    public createHousehold: RequestHandler = async (req: any, res: any) => {
        try {
            const parsed = HouseholdParamsSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: parsed.error.errors });
            }

            const data = parsed.data;

            if (!data.userId || data.userId.length === 0) {
                return res.status(400).json({ error: "At least one user ID is required" });
            }

            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepository.findOne({
                where: { id: req.user.userId }
            });
            data.userId = data.userId.concat(req.user.userId);
            const users = await UserRepository.find({
                where: {
                    id: In(data.userId),
                }
            });
            if (users.length !== data.userId.length) {
                return res.status(404).json({ error: "One or more user IDs not found" });
            }

            const usersAlreadyInHousehold = users.filter(user => user.householdId !== null && user.householdId !== undefined);
            if (usersAlreadyInHousehold.length > 0) {
                return res.status(400).json({
                    error: "Some users already belong to a household",
                });
            }

            const household = householdRepository.create({
                address: data.address,
                lat: data.lat,
                lng: data.lng,
                members: users,
            });
            await householdRepository.save(household);

            const createdHousehold = await householdRepository.findOne({
                where: { id: household.id },
                relations: { members: true }
            });
            return res.status(201).json({
                message: "Household created successfully",
                data: createdHousehold
            });

        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public getHousehold: RequestHandler = async (req: any, res: any) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const user = await UserRepository.findOne({
                where: { id: req.user.userId },
                relations: { household: true }
            });

            if (!user) {
                return res.status(404).json({ error: "Unauthorized" });
            }
            const holdhousehold = await householdRepository.findOne({
                where: { id: user?.householdId },
                relations: { members: true }
            });
            if (!holdhousehold) {
                return res.status(404).json({ error: "Household not found" });
            }
            return res.status(200).json({ data: holdhousehold });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });

        }
    }

    public updateHousehold: RequestHandler = async (req: any, res: any) => {
        try {
            const parsed = UpdateHouseholdParamsSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: parsed.error.errors });
            }
            const data = parsed.data;
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const user = await UserRepository.findOne({
                where: { id: req.user.userId },
                relations: { household: true }
            });

            if (!user) {
                return res.status(404).json({ error: "Unauthorized" });
            }

            const household = await householdRepository.findOne({
                where: { id: user.householdId },
                relations: { members: true }
            });
            if (!household) {
                return res.status(404).json({ error: "Household not found" });
            }
            const newHouseholdData = new Household();
            newHouseholdData.address = data.address ?? household.address;
            newHouseholdData.lat = data.lat ?? household.lat;
            newHouseholdData.lng = data.lng ?? household.lng;

            if (data.userId) {
                const users = await UserRepository.find({
                    where: {
                        id: In(data.userId),
                    }
                });
                if (users.length !== data.userId.length) {
                    return res.status(404).json({ error: "One or more user IDs not found" });
                }
                const usersAlreadyInHousehold = users.filter(user => user.householdId !== null && user.householdId !== undefined && user.householdId !== household.id);
                if (usersAlreadyInHousehold.length > 0) {
                    return res.status(400).json({
                        error: "Some users already belong to a different household",
                    });
                }

                newHouseholdData.members = household.members?.concat(users);
            }

            Object.assign(household, newHouseholdData);
            await householdRepository.save(household);

            return res.status(200).json({ message: "Household updated successfully", data: household });
        } catch (error: any) {
            res.status(500).json({ error: "Internal server error", details: error.message });
        }
    }

    public deleteHouseholdMembers: RequestHandler = async (req: any, res: any) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            if (!req.params.id) {
                return res.status(400).json({ error: "User ID is required" });
            }

            const [user, member] = await Promise.all([
                UserRepository.findOne({
                    where: { id: req.user.userId },
                    relations: { household: true }
                }),
                UserRepository.findOne({
                    where: { id: req.params.id },
                    relations: { household: true }
                })
            ]);

            if (!user && !member) {
                return res.status(404).json({ error: "User or member not found" });
            }

            if (!user?.householdId || user.householdId !== member?.householdId) {
                return res.status(403).json({ error: "Forbidden: You can only remove members from your own household" });
            }

            member.household = null;
            await UserRepository.save(member);

            return res.status(200).json({ message: "Member removed from household successfully" });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}
export default new HouseholdController();