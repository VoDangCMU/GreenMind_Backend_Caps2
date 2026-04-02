import { Request, Response } from "express";
import { z } from "zod";
import AppDataSource from "../infrastructure/database";
import { EnvironmentalImpact } from "../entity/environmental_impact";
import { Locations } from "../entity/locations";
import { Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";

const ImpactQuerySchema = z.object({
    range: z.enum(["day", "week", "month"]).default("month"),
});

const ImpactRecordSchema = z.object({
    record_date: z.string().datetime({ offset: true }).optional(),
    co2_emission: z.number().nonnegative().optional(),
    methane_emission: z.number().nonnegative().optional(),
    nitrous_oxide: z.number().nonnegative().optional(),
    particulate_matter: z.number().nonnegative().optional(),
    sulfur_dioxide: z.number().nonnegative().optional(),
    nitrogen_dioxide: z.number().nonnegative().optional(),
    carbon_monoxide: z.number().nonnegative().optional(),
    volatile_organic: z.number().nonnegative().optional(),
    ammonia: z.number().nonnegative().optional(),
    lead_emission: z.number().nonnegative().optional(),
    mercury_emission: z.number().nonnegative().optional(),
    cadmium_emission: z.number().nonnegative().optional(),
    benzene_emission: z.number().nonnegative().optional(),
    ozone_depletion: z.number().nonnegative().optional(),
    radioactive_waste: z.number().nonnegative().optional(),
});

const ImpactRepo = () => AppDataSource.getRepository(EnvironmentalImpact);
const LocationRepo = () => AppDataSource.getRepository(Locations);

function buildDateRange(range: "day" | "week" | "month"): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();

    if (range === "day") {
        from.setHours(0, 0, 0, 0);
    } else if (range === "week") {
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
    } else {
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
    }

    return { from, to };
}

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function computePollutionFromDistance(distanceKm: number) {
    const base = distanceKm * 0.21; // CO2 factor per km

    return {
        co2Emission: parseFloat((base * 2.0).toFixed(2)),
        methaneEmission: parseFloat((base * 0.43).toFixed(2)),
        nitrousOxide: parseFloat((base * 0.23).toFixed(2)),
        particulateMatter: parseFloat((base * 0.74).toFixed(2)),
        sulfurDioxide: parseFloat((base * 0.35).toFixed(2)),
        nitrogenDioxide: parseFloat((base * 0.48).toFixed(2)),
        carbonMonoxide: parseFloat((base * 0.66).toFixed(2)),
        volatileOrganic: parseFloat((base * 0.31).toFixed(2)),
        ammonia: parseFloat((base * 0.21).toFixed(2)),
        leadEmission: parseFloat((base * 0.10).toFixed(2)),
        mercuryEmission: parseFloat((base * 0.07).toFixed(2)),
        cadmiumEmission: parseFloat((base * 0.04).toFixed(2)),
        benzeneEmission: parseFloat((base * 0.16).toFixed(2)),
        ozoneDepletion: parseFloat((base * 0.45).toFixed(2)),
        radioactiveWaste: parseFloat((base * 0.08).toFixed(2)),
    };
}

function computeImpact(pollution: ReturnType<typeof computePollutionFromDistance>) {
    const airPollution = parseFloat(
        (pollution.co2Emission + pollution.nitrogenDioxide + pollution.sulfurDioxide +
            pollution.particulateMatter + pollution.carbonMonoxide + pollution.ozoneDepletion).toFixed(2)
    );
    const waterPollution = parseFloat(
        (pollution.ammonia + pollution.mercuryEmission + pollution.cadmiumEmission + pollution.leadEmission).toFixed(2)
    );
    const soilPollution = parseFloat(
        (pollution.radioactiveWaste + pollution.benzeneEmission + pollution.volatileOrganic + pollution.methaneEmission).toFixed(2)
    );

    return { airPollution, waterPollution, soilPollution };
}

function mapEntityToPollutionObject(record: EnvironmentalImpact) {
    return {
        co2_emission: record.co2Emission,
        methane_emission: record.methaneEmission,
        nitrous_oxide: record.nitrousOxide,
        particulate_matter: record.particulateMatter,
        sulfur_dioxide: record.sulfurDioxide,
        nitrogen_dioxide: record.nitrogenDioxide,
        carbon_monoxide: record.carbonMonoxide,
        volatile_organic: record.volatileOrganic,
        ammonia: record.ammonia,
        lead_emission: record.leadEmission,
        mercury_emission: record.mercuryEmission,
        cadmium_emission: record.cadmiumEmission,
        benzene_emission: record.benzeneEmission,
        ozone_depletion: record.ozoneDepletion,
        radioactive_waste: record.radioactiveWaste,
    };
}

class EnvironmentalImpactController {
    /**
     * GET /environmental-impact?range=day|week|month
     * Returns aggregated pollution + impact + time series for the authenticated user
     */
    public async getSummary(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = ImpactQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const { range } = parsed.data;
        const { from, to } = buildDateRange(range);

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

            // Aggregate pollution across all records in range
            const pollution = {
                co2_emission: 0, methane_emission: 0, nitrous_oxide: 0,
                particulate_matter: 0, sulfur_dioxide: 0, nitrogen_dioxide: 0,
                carbon_monoxide: 0, volatile_organic: 0, ammonia: 0,
                lead_emission: 0, mercury_emission: 0, cadmium_emission: 0,
                benzene_emission: 0, ozone_depletion: 0, radioactive_waste: 0,
            };

            let totalAir = 0;
            let totalWater = 0;
            let totalSoil = 0;

            const pollutionKeys = Object.keys(pollution) as (keyof typeof pollution)[];

            for (const record of records) {
                const p = mapEntityToPollutionObject(record);
                for (const key of pollutionKeys) {
                    pollution[key] = parseFloat((pollution[key] + p[key]).toFixed(2));
                }
                totalAir += record.airPollution;
                totalWater += record.waterPollution;
                totalSoil += record.soilPollution;
            }

            const count = records.length;
            const impact = {
                air_pollution: parseFloat((totalAir / count).toFixed(2)),
                water_pollution: parseFloat((totalWater / count).toFixed(2)),
                soil_pollution: parseFloat((totalSoil / count).toFixed(2)),
            };

            const timeSeries = records.map((r, i) => ({
                day: i + 1,
                air_pollution: r.airPollution,
                water_pollution: r.waterPollution,
                soil_pollution: r.soilPollution,
            }));

            return res.status(200).json({
                message: "Environmental impact summary retrieved successfully",
                data: { pollution, impact, timeSeries },
            });
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * POST /environmental-impact/compute
     * Auto-compute today's environmental impact from user's location data
     */
    public async computeFromLocations(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const today = startOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
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

            const pollution = computePollutionFromDistance(distanceKm);
            const { airPollution, waterPollution, soilPollution } = computeImpact(pollution);

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
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * POST /environmental-impact
     * Manually log environmental impact for a given date
     */
    public async logImpact(req: Request, res: Response) {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = ImpactRecordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        const data = parsed.data;
        const recordDate = data.record_date ? startOfDay(new Date(data.record_date)) : startOfDay(new Date());

        try {
            const existing = await ImpactRepo().findOne({
                where: { userId: req.user.userId, recordDate },
            });

            const record = existing ?? ImpactRepo().create({ userId: req.user.userId });

            if (data.co2_emission !== undefined)       record.co2Emission = data.co2_emission;
            if (data.methane_emission !== undefined)   record.methaneEmission = data.methane_emission;
            if (data.nitrous_oxide !== undefined)      record.nitrousOxide = data.nitrous_oxide;
            if (data.particulate_matter !== undefined) record.particulateMatter = data.particulate_matter;
            if (data.sulfur_dioxide !== undefined)     record.sulfurDioxide = data.sulfur_dioxide;
            if (data.nitrogen_dioxide !== undefined)   record.nitrogenDioxide = data.nitrogen_dioxide;
            if (data.carbon_monoxide !== undefined)    record.carbonMonoxide = data.carbon_monoxide;
            if (data.volatile_organic !== undefined)   record.volatileOrganic = data.volatile_organic;
            if (data.ammonia !== undefined)            record.ammonia = data.ammonia;
            if (data.lead_emission !== undefined)      record.leadEmission = data.lead_emission;
            if (data.mercury_emission !== undefined)   record.mercuryEmission = data.mercury_emission;
            if (data.cadmium_emission !== undefined)   record.cadmiumEmission = data.cadmium_emission;
            if (data.benzene_emission !== undefined)   record.benzeneEmission = data.benzene_emission;
            if (data.ozone_depletion !== undefined)    record.ozoneDepletion = data.ozone_depletion;
            if (data.radioactive_waste !== undefined)  record.radioactiveWaste = data.radioactive_waste;

            record.recordDate = recordDate;

            const pollution = computePollutionFromDistance(0);
            const impact = computeImpact({
                co2Emission: record.co2Emission,
                methaneEmission: record.methaneEmission,
                nitrousOxide: record.nitrousOxide,
                particulateMatter: record.particulateMatter,
                sulfurDioxide: record.sulfurDioxide,
                nitrogenDioxide: record.nitrogenDioxide,
                carbonMonoxide: record.carbonMonoxide,
                volatileOrganic: record.volatileOrganic,
                ammonia: record.ammonia,
                leadEmission: record.leadEmission,
                mercuryEmission: record.mercuryEmission,
                cadmiumEmission: record.cadmiumEmission,
                benzeneEmission: record.benzeneEmission,
                ozoneDepletion: record.ozoneDepletion,
                radioactiveWaste: record.radioactiveWaste,
            });

            record.airPollution = impact.airPollution;
            record.waterPollution = impact.waterPollution;
            record.soilPollution = impact.soilPollution;

            void pollution; // unused variable suppressed

            const saved = await ImpactRepo().save(record);

            return res.status(201).json({
                message: "Environmental impact logged",
                data: saved,
            });
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /**
     * GET /environmental-impact/history
     * Returns full history paginated (admin or self)
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
        } catch {
            return res.status(500).json({ message: "Internal server error" });
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
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new EnvironmentalImpactController();
