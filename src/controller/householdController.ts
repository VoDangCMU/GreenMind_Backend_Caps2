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
});

const UpdateHouseholdParamsSchema = z.object({
    address: TEXT.optional(),
    lat: DECIMAL.optional(),
    lng: DECIMAL.optional(),
    userId: z.string().uuid().optional()
});
const UserRepository = AppDataSource.getRepository(User);
const householdRepository = AppDataSource.getRepository(Household);

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
            return res.status(201).json({
                message: "Household created successfully",
                data: newHousehold
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