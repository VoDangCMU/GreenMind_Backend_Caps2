import AppDataSource from "../infrastructure/database";
import DECIMAL from "../config/schemas/Decimal";
import TEXT from "../config/schemas/Text";
import { z } from "zod";
import { In } from "typeorm";
import { User } from "../entity/user";
import { Household } from "../entity/household";
import e, { RequestHandler } from "express";
import { GreenScore } from "../entity/greenScore";
const HouseholdParamsSchema = z.object({
    address: TEXT,
    lat: DECIMAL,
    lng: DECIMAL,
});

const UpdateHouseholdParamsSchema = z.object({
    address: TEXT.optional(),
    lat: DECIMAL.optional(),
    lng: DECIMAL.optional(),
    userId: z.string().uuid().optional()
});

const CreateHouseholdByAdminSchema = z.object({
    address: TEXT,
    lat: DECIMAL,
    lng: DECIMAL,
    emails: z.array(z.string().email()).min(1)
});
const UserRepository = AppDataSource.getRepository(User);
const householdRepository = AppDataSource.getRepository(Household);
const greenScoreRepository = AppDataSource.getRepository(GreenScore);

export class HouseholdController {

    public createHousehold: RequestHandler = async (req: any, res: any) => {
        try {
            const parsed = HouseholdParamsSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: parsed.error.errors });
            }

            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const user = await UserRepository.findOne({
                where: { id: req.user.userId },
                relations: { household: true }
            });

            if (user?.household) {
                return res.status(400).json({ error: "User already belongs to a household" });
            }

            const data = parsed.data;

            const newHousehold = householdRepository.create({
                address: data.address,
                lat: data.lat,
                lng: data.lng,
                members: user ? [user] : []
            });
            await householdRepository.save(newHousehold);

            const defaultScore = greenScoreRepository.create({
                previousScore: 50,
                delta: 0,
                finalScore: 50,
                householdId: newHousehold.id,
                household: newHousehold
            });
            await greenScoreRepository.save(defaultScore);

            return res.status(201).json({
                message: "Household created successfully",
                data: {
                    household: newHousehold,
                    greenScore: defaultScore.finalScore
                }
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

            if (!user.householdId) {
                return res.status(404).json({ error: "User does not belong to a household" });
            }
            const holdhousehold = await householdRepository.findOne({
                where: { id: user.householdId },
                relations: {
                    members: true
                }
            });

            if (!holdhousehold) {
                return res.status(404).json({ error: "Household not found" });
            }

            const score = await AppDataSource.getRepository(GreenScore).findOne({
                where: { householdId: user.householdId },
                order: { createdAt: "DESC" }
            });

            res.status(200).json({
                data: {
                    holdhousehold,
                    greenScore: score?.finalScore
                }
            });
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
                const memberToAdd = await UserRepository.findOne({
                    where: { id: data.userId },
                    relations: { household: true }
                });

                if (!memberToAdd) {
                    return res.status(400).json({ error: "Invalid user ID" });
                }

                if (memberToAdd.household) {
                    return res.status(400).json({ error: "User already belongs to a household" });
                }
                newHouseholdData.members = [memberToAdd, ...(household.members || [])];
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

            if (!user || !member) {
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

    public getAllHouseholds: RequestHandler = async (_req: any, res: any) => {
        try {
            const households = await householdRepository.find({
                order: { createdAt: "DESC" },
                relations: { members: true }
            });

            const greenScores = await greenScoreRepository.find({
                where: { householdId: In(households.map(h => h.id)) },
                order: { createdAt: "DESC" }
            });
            const householdData = households.map(household => {
                const score = greenScores.find(score => score.householdId === household.id);
                return {
                    ...household,
                    greenScore: score ? score.finalScore : 50
                };
            });
            return res.status(200).json({
                message: "Households retrieved successfully",
                data: householdData
            });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }

    public createHouseholdByAdmin: RequestHandler = async (req: any, res: any) => {
        try {
            const parsed = CreateHouseholdByAdminSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: parsed.error.errors });
            }
            const data = parsed.data;

            const users = await UserRepository.find({
                where: { email: In(data.emails) },
                relations: { household: true }
            });

            if (users.length !== data.emails.length) {
                return res.status(400).json({ error: "Some emails not found" });
            }

            const usersWithHousehold = users.filter(u => u.household);
            if (usersWithHousehold.length > 0) {
                return res.status(400).json({
                    error: "Some users already belong to a household",
                    emails: usersWithHousehold.map(u => u.email)
                });
            }

            const newHousehold = householdRepository.create({
                address: data.address,
                lat: data.lat,
                lng: data.lng,
                members: users
            });
            await householdRepository.save(newHousehold);

            const defaultScore = greenScoreRepository.create({
                previousScore: 50,
                delta: 0,
                finalScore: 50,
                householdId: newHousehold.id,
                household: newHousehold
            });
            await greenScoreRepository.save(defaultScore);

            res.status(201).json({
                message: "Household created successfully",
                data: {
                    household: newHousehold,
                    members: users.length,
                    greenScore: defaultScore.finalScore
                }
            });
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}
export default new HouseholdController();