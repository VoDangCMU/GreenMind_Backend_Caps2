import { Request, Response } from "express";
import { z } from "zod";
import AppDataSource from "../infrastructure/database";
import { EnvironmentalImpact } from "../entity/environmental_impact";
import { Locations } from "../entity/locations";
import { User } from "../entity/user";
import { Household } from "../entity/household";
import { UrbanArea } from "../entity/urban_area";
import { Between, In } from "typeorm";

const ImpactQuerySchema = z.object({
    range: z.enum(["day", "week", "month"]).default("month"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    urbanAreaId: z.string().optional(),
});

const PollutionSchema = z.object({
    CO2: z.number().nonnegative().optional(),
    dioxin: z.number().nonnegative().optional(),
    microplastic: z.number().nonnegative().optional(),
    toxic_chemicals: z.number().nonnegative().optional(),
    non_biodegradable: z.number().nonnegative().optional(),
    NOx: z.number().nonnegative().optional(),
    SO2: z.number().nonnegative().optional(),
    CH4: z.number().nonnegative().optional(),
    "PM2.5": z.number().nonnegative().optional(),
    Pb: z.number().nonnegative().optional(),
    Hg: z.number().nonnegative().optional(),
    Cd: z.number().nonnegative().optional(),
    nitrate: z.number().nonnegative().optional(),
    chemical_residue: z.number().nonnegative().optional(),
    styrene: z.number().nonnegative().optional(),
}).optional();

const ImpactBodySchema = z.object({
    record_date: z.string().datetime({ offset: true }).optional(),
    pollution: PollutionSchema,
    impact: z.object({
        air: z.number().nonnegative().optional(),
        water: z.number().nonnegative().optional(),
        soil: z.number().nonnegative().optional(),
    }).optional(),
});

const ImpactRepo = () => AppDataSource.getRepository(EnvironmentalImpact);
const LocationRepo = () => AppDataSource.getRepository(Locations);
const UserRepo = () => AppDataSource.getRepository(User);
const HouseholdRepo = () => AppDataSource.getRepository(Household);
const UrbanAreaRepo = () => AppDataSource.getRepository(UrbanArea);

async function assertUserExists(userId: string, res: Response): Promise<boolean> {
    const exists = await UserRepo().findOne({ where: { id: userId }, select: ["id"] });
    if (!exists) {
        res.status(404).json({ message: "User not found in database" });
        return false;
    }
    return true;
}

function buildDateRange(range: "day" | "week" | "month", startDate?: string, endDate?: string): { from: Date; to: Date } {
    const to = endDate ? new Date(endDate) : new Date();
    const from = startDate ? new Date(startDate) : new Date();

    if (!startDate) {
        if (range === "day") {
            from.setHours(0, 0, 0, 0);
        } else if (range === "week") {
            from.setDate(from.getDate() - 7);
        } else {
            from.setDate(from.getDate() - 30);
        }
    }
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    return { from, to };
}

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function mapEntityToPollutionObject(record: EnvironmentalImpact) {
    return {
        CO2: record.co2,
        dioxin: record.dioxin,
        microplastic: record.microplastic,
        toxic_chemicals: record.toxicChemicals,
        non_biodegradable: record.nonBiodegradable,
        NOx: record.nox,
        SO2: record.so2,
        CH4: record.ch4,
        "PM2.5": record.pm25,
        Pb: record.pb,
        Hg: record.hg,
        Cd: record.cd,
        nitrate: record.nitrate,
        chemical_residue: record.chemicalResidue,
        styrene: record.styrene,
    };
}

/** Helper: aggregate array of EnvironmentalImpact records into pollution/impact/timeSeries */
function aggregateRecords(records: EnvironmentalImpact[]) {
    const pollution = {
        CO2: 0, dioxin: 0, microplastic: 0, toxic_chemicals: 0,
        non_biodegradable: 0, NOx: 0, SO2: 0, CH4: 0,
        "PM2.5": 0, Pb: 0, Hg: 0, Cd: 0,
        nitrate: 0, chemical_residue: 0, styrene: 0,
    };
    let totalAir = 0, totalWater = 0, totalSoil = 0;
    type PollKey = keyof typeof pollution;
    const pollutionKeys = Object.keys(pollution) as PollKey[];

    const byDate = new Map<string, { air: number; water: number; soil: number; n: number }>();

    for (const record of records) {
        const p = mapEntityToPollutionObject(record);
        for (const key of pollutionKeys) {
            pollution[key] = parseFloat((pollution[key] + (p[key] ?? 0)).toFixed(4));
        }
        totalAir += record.airPollution ?? 0;
        totalWater += record.waterPollution ?? 0;
        totalSoil += record.soilPollution ?? 0;

        // TypeORM returns date columns as strings from Postgres — cast defensively
        const d = record.recordDate instanceof Date
            ? record.recordDate
            : new Date(record.recordDate);
        const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;

        const slot = byDate.get(dateLabel) ?? { air: 0, water: 0, soil: 0, n: 0 };
        slot.air += record.airPollution ?? 0;
        slot.water += record.waterPollution ?? 0;
        slot.soil += record.soilPollution ?? 0;
        slot.n += 1;
        byDate.set(dateLabel, slot);
    }

    const count = records.length || 1;
    const impact = {
        air: parseFloat((totalAir / count).toFixed(4)),
        water: parseFloat((totalWater / count).toFixed(4)),
        soil: parseFloat((totalSoil / count).toFixed(4)),
    };

    const timeSeries = Array.from(byDate.entries()).map(([date, v], i) => ({
        day: i + 1,
        date,
        air: parseFloat((v.air / v.n).toFixed(4)),
        water: parseFloat((v.water / v.n).toFixed(4)),
        soil: parseFloat((v.soil / v.n).toFixed(4)),
    }));

    return { pollution, impact, timeSeries };
}

class EnvironmentalImpactController {
    /**
     * GET /environmental-impact?range=day|week|month&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
     * Returns aggregated pollution + impact + timeSeries for the authenticated user.
     * startDate/endDate override the range preset when provided.
     */
    public async getSummary(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = ImpactQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const { range, startDate, endDate } = parsed.data;
        const { from, to } = buildDateRange(range, startDate, endDate);

        try {
            const records = await ImpactRepo().find({
                where: {
                    userId: req.user.userId,
                    recordDate: Between(from, to),
                },
                order: { recordDate: "ASC" },
            });

            if (records.length === 0) {
                return res.status(404).json({ message: "No environmental impact data found for this period" });
            }

            const { pollution, impact, timeSeries } = aggregateRecords(records);

            return res.status(200).json({
                message: "Environmental impact summary retrieved successfully",
                data: { pollution, impact, timeSeries },
            });
        } catch (e) {
            console.error("[getSummary]", e);
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * GET /environmental-impact/all?range=day|week|month&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&urbanAreaId=<uuid>
     * Admin aggregate: sums data across ALL users (or users in a specific urban area).
     */
    public async getSummaryAll(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = ImpactQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const { range, startDate, endDate, urbanAreaId } = parsed.data;
        const { from, to } = buildDateRange(range, startDate, endDate);

        try {
            // If urbanAreaId provided, resolve to list of userIds in that area
            let userIds: string[] | undefined;
            if (urbanAreaId) {
                const households = await HouseholdRepo().find({
                    where: { urbanAreaId },
                    select: ["id"],
                });
                const householdIds = households.map(h => h.id);

                if (householdIds.length === 0) {
                    return res.status(404).json({ message: "No users found in this urban area" });
                }

                const users = await UserRepo().find({
                    where: { householdId: In(householdIds) },
                    select: ["id"],
                });
                userIds = users.map(u => u.id);

                if (userIds.length === 0) {
                    return res.status(404).json({ message: "No environmental impact data found for this area" });
                }
            }

            const records = await ImpactRepo().find({
                where: {
                    ...(userIds ? { userId: In(userIds) } : {}),
                    recordDate: Between(from, to),
                },
                order: { recordDate: "ASC" },
            });

            if (records.length === 0) {
                return res.status(404).json({ message: "No environmental impact data found for this period" });
            }

            const { pollution, impact, timeSeries } = aggregateRecords(records);

            return res.status(200).json({
                message: "Environmental impact (all users) retrieved successfully",
                data: { pollution, impact, timeSeries, recordCount: records.length },
            });
        } catch (e) {
            console.error("[getSummaryAll]", e);
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * GET /environmental-impact/urban-areas
     * Returns list of all urban areas for filter dropdown.
     */
    public async getUrbanAreas(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            const areas = await UrbanAreaRepo().find({
                order: { city: "ASC", name: "ASC" },
                select: ["id", "name", "city"],
            });
            return res.status(200).json({ message: "Urban areas retrieved", data: areas });
        } catch (e) {
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * POST /environmental-impact
     * Log / upsert environmental impact for a given date.
     * Body: { record_date?, pollution: { CO2, dioxin, ... }, impact: { air, water, soil } }
     */
    public async logImpact(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = ImpactBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const { record_date, pollution, impact } = parsed.data;
        const recordDate = record_date
            ? startOfDay(new Date(record_date))
            : startOfDay(new Date());

        try {
            const userOk = await assertUserExists(req.user.userId, res);
            if (!userOk) return;

            const existing = await ImpactRepo().findOne({
                where: { userId: req.user.userId, recordDate },
            });

            const record = existing ?? ImpactRepo().create({ userId: req.user.userId });
            record.recordDate = recordDate;

            // Apply pollution fields if provided
            if (pollution) {
                if (pollution.CO2 !== undefined) record.co2 = pollution.CO2;
                if (pollution.dioxin !== undefined) record.dioxin = pollution.dioxin;
                if (pollution.microplastic !== undefined) record.microplastic = pollution.microplastic;
                if (pollution.toxic_chemicals !== undefined) record.toxicChemicals = pollution.toxic_chemicals;
                if (pollution.non_biodegradable !== undefined) record.nonBiodegradable = pollution.non_biodegradable;
                if (pollution.NOx !== undefined) record.nox = pollution.NOx;
                if (pollution.SO2 !== undefined) record.so2 = pollution.SO2;
                if (pollution.CH4 !== undefined) record.ch4 = pollution.CH4;
                if (pollution["PM2.5"] !== undefined) record.pm25 = pollution["PM2.5"];
                if (pollution.Pb !== undefined) record.pb = pollution.Pb;
                if (pollution.Hg !== undefined) record.hg = pollution.Hg;
                if (pollution.Cd !== undefined) record.cd = pollution.Cd;
                if (pollution.nitrate !== undefined) record.nitrate = pollution.nitrate;
                if (pollution.chemical_residue !== undefined) record.chemicalResidue = pollution.chemical_residue;
                if (pollution.styrene !== undefined) record.styrene = pollution.styrene;
            }

            // Apply impact fields if provided
            if (impact) {
                if (impact.air !== undefined) record.airPollution = impact.air;
                if (impact.water !== undefined) record.waterPollution = impact.water;
                if (impact.soil !== undefined) record.soilPollution = impact.soil;
            }

            const saved = await ImpactRepo().save(record);

            return res.status(existing ? 200 : 201).json({
                message: existing ? "Environmental impact updated" : "Environmental impact logged",
                data: saved,
            });
        } catch (e) {
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * GET /environmental-impact/history
     * Returns full history paginated
     */
    public async getHistory(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "30"), 10)));

        try {
            const [records, total] = await ImpactRepo().findAndCount({
                where: { userId: req.user.userId },
                order: { recordDate: "DESC" },
                skip: (page - 1) * limit,
                take: limit,
            });

            return res.status(200).json({
                message: "History retrieved",
                data: records,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (e) {
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * POST /environmental-impact/compute
     * Auto-compute today's environmental impact from user's location data (GPS distance).
     * Uses simplified emission factors for new pollutant schema.
     */
    public async computeFromLocations(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const today = startOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            const userOk = await assertUserExists(req.user.userId, res);
            if (!userOk) return;

            const locations = await LocationRepo().find({
                where: {
                    userId: req.user.userId,
                    createdAt: Between(today, tomorrow),
                },
                order: { createdAt: "ASC" },
            });

            const distanceKm = locations.reduce(
                (acc, loc) => acc + (loc.lengthToPreviousLocation ?? 0),
                0
            );

            // Emission factors per km (transport-based estimates)
            const base = distanceKm * 0.21;
            const pollution = {
                co2: parseFloat((base * 2.0).toFixed(4)),
                dioxin: parseFloat((base * 0.005).toFixed(4)),
                microplastic: parseFloat((base * 0.01).toFixed(4)),
                toxicChemicals: parseFloat((base * 0.15).toFixed(4)),
                nonBiodegradable: parseFloat((base * 0.12).toFixed(4)),
                nox: parseFloat((base * 0.48).toFixed(4)),
                so2: parseFloat((base * 0.35).toFixed(4)),
                ch4: parseFloat((base * 0.43).toFixed(4)),
                pm25: parseFloat((base * 0.74).toFixed(4)),
                pb: parseFloat((base * 0.10).toFixed(4)),
                hg: parseFloat((base * 0.07).toFixed(4)),
                cd: parseFloat((base * 0.04).toFixed(4)),
                nitrate: parseFloat((base * 0.20).toFixed(4)),
                chemicalResidue: parseFloat((base * 0.08).toFixed(4)),
                styrene: parseFloat((base * 0.06).toFixed(4)),
            };

            const airPollution = parseFloat((pollution.co2 + pollution.nox + pollution.so2 + pollution.pm25).toFixed(4));
            const waterPollution = parseFloat((pollution.pb + pollution.hg + pollution.cd + pollution.nitrate).toFixed(4));
            const soilPollution = parseFloat((pollution.ch4 + pollution.styrene + pollution.toxicChemicals + pollution.nonBiodegradable).toFixed(4));

            const existing = await ImpactRepo().findOne({
                where: { userId: req.user.userId, recordDate: today },
            });

            const record = existing ?? ImpactRepo().create({ userId: req.user.userId });
            Object.assign(record, {
                recordDate: today,
                ...pollution,
                airPollution,
                waterPollution,
                soilPollution,
            });

            const saved = await ImpactRepo().save(record);

            return res.status(200).json({
                message: "Environmental impact computed and saved",
                data: saved,
            });
        } catch (e) {
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * POST /environmental-impact/compute-all
     * Compute today's environmental impact for ALL users — uses batch queries to avoid N+1.
     */
    public async computeAllUsers(req: Request, res: Response) {
        const today = startOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            const allUsers = await UserRepo().find({ select: ["id"] });
            if (allUsers.length === 0) {
                return res.status(200).json({ message: "No users found", data: { total: 0, success: 0, skipped: 0, failed: 0 } });
            }

            const userIds = allUsers.map(u => u.id);

            // Batch: all locations for today in 1 query
            const allLocations = await LocationRepo().find({
                where: { createdAt: Between(today, tomorrow) },
                select: ["userId", "lengthToPreviousLocation"],
            });

            // Group by userId
            const distanceByUser = new Map<string, number>();
            for (const loc of allLocations) {
                distanceByUser.set(
                    loc.userId,
                    (distanceByUser.get(loc.userId) ?? 0) + (loc.lengthToPreviousLocation ?? 0)
                );
            }

            // Batch: all existing impacts for today in 1 query
            const existingImpacts = await ImpactRepo().find({
                where: { userId: In(userIds), recordDate: Between(today, tomorrow) },
                select: ["id", "userId"],
            });
            const existingByUser = new Map(existingImpacts.map(e => [e.userId, e]));

            const toSave: EnvironmentalImpact[] = [];
            let skippedCount = 0;

            for (const user of allUsers) {
                const distanceKm = distanceByUser.get(user.id) ?? 0;
                const existing = existingByUser.get(user.id);

                if (distanceKm === 0 && !existing) { skippedCount++; continue; }

                const base = distanceKm * 0.21;
                const pollution = {
                    co2: parseFloat((base * 2.0).toFixed(4)),
                    dioxin: parseFloat((base * 0.005).toFixed(4)),
                    microplastic: parseFloat((base * 0.01).toFixed(4)),
                    toxicChemicals: parseFloat((base * 0.15).toFixed(4)),
                    nonBiodegradable: parseFloat((base * 0.12).toFixed(4)),
                    nox: parseFloat((base * 0.48).toFixed(4)),
                    so2: parseFloat((base * 0.35).toFixed(4)),
                    ch4: parseFloat((base * 0.43).toFixed(4)),
                    pm25: parseFloat((base * 0.74).toFixed(4)),
                    pb: parseFloat((base * 0.10).toFixed(4)),
                    hg: parseFloat((base * 0.07).toFixed(4)),
                    cd: parseFloat((base * 0.04).toFixed(4)),
                    nitrate: parseFloat((base * 0.20).toFixed(4)),
                    chemicalResidue: parseFloat((base * 0.08).toFixed(4)),
                    styrene: parseFloat((base * 0.06).toFixed(4)),
                };
                const airPollution = parseFloat((pollution.co2 + pollution.nox + pollution.so2 + pollution.pm25).toFixed(4));
                const waterPollution = parseFloat((pollution.pb + pollution.hg + pollution.cd + pollution.nitrate).toFixed(4));
                const soilPollution = parseFloat((pollution.ch4 + pollution.styrene + pollution.toxicChemicals + pollution.nonBiodegradable).toFixed(4));

                const record = existing ?? ImpactRepo().create({ userId: user.id });
                Object.assign(record, { recordDate: today, ...pollution, airPollution, waterPollution, soilPollution });
                toSave.push(record);
            }

            // Bulk save
            await ImpactRepo().save(toSave, { chunk: 100 });

            return res.status(200).json({
                message: "Compute-all finished",
                data: {
                    total: allUsers.length,
                    success: toSave.length,
                    skipped: skippedCount,
                    failed: 0,
                },
            });
        } catch (e) {
            console.error("[computeAllUsers]", e);
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }

    /**
     * DELETE /environmental-impact/:id
     */
    public async deleteRecord(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Missing record id" });
        }

        try {
            const record = await ImpactRepo().findOne({
                where: { id, userId: req.user.userId },
            });

            if (!record) {
                return res.status(404).json({ message: "Record not found" });
            }

            await ImpactRepo().remove(record);

            return res.status(200).json({ message: "Record deleted" });
        } catch (e) {
            return res.status(500).json({ message: (e as Error).message ?? "Internal server error" });
        }
    }
}

export default new EnvironmentalImpactController();
