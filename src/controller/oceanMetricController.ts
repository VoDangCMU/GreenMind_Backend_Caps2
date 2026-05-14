import { Request, Response } from "express";
import AppDataSource from "../infrastructure/database";
import { BigFive } from "../entity/big_five";
import { OceanMetrics } from "../entity/ocean_metrics";
import { Invoice } from "../entity/invoice";
import { PreAppSurvey } from "../entity/pre_app_survey";
import { Locations } from "../entity/locations";
import { Todo } from "../entity/todos";
import axios from "axios";
import { z } from "zod";

const OceanMetricsRepo = AppDataSource.getRepository(OceanMetrics);
const BigFiveRepo = AppDataSource.getRepository(BigFive);
const InvoiceRepo = AppDataSource.getRepository(Invoice);
const PreAppSurveyRepo = AppDataSource.getRepository(PreAppSurvey);
const LocationsRepo = AppDataSource.getRepository(Locations);
const TodoRepo = AppDataSource.getRepository(Todo);

const SPEND_API_URL = "https://ai-greenmind.khoav4.com/avg_daily_spend";
const VARIABILITY_API_URL = "https://ai-greenmind.khoav4.com/spend_variability";
const DISTANCE_API_URL = "https://ai-greenmind.khoav4.com/daily_distance_km";
const LIST_ADHERENCE_API_URL = "https://ai-greenmind.khoav4.com/list_adherence";

const OceanScoreSchema = z.object({
    O: z.number(),
    C: z.number(),
    E: z.number(),
    A: z.number(),
    N: z.number(),
});

const AnalyzeResponseSchema = z.object({
    metric: z.string(),
    vt: z.number(),
    bt: z.number(),
    r: z.number(),
    n: z.number(),
    contrib: z.number(),
    new_ocean_score: OceanScoreSchema,
    mechanismFeedback: z
        .object({
            awareness: z.string(),
            motivation: z.string(),
            capability: z.string(),
            opportunity: z.string(),
        })
        .optional(),
    reason: z.string().optional(),
});

class OceanMetricController {
    public calculateMetric = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            let bigFive = await BigFiveRepo.findOne({
                where: { user: { id: userId } },
            });

            if (!bigFive) {
                return res.status(400).json({
                    error: "User does not have OCEAN scores yet",
                });
            }

            const preOceanScore: z.infer<typeof OceanScoreSchema> = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism,
            };

            const preAppSurvey = await PreAppSurveyRepo.findOne({
                where: { userId },
            });

            if (!preAppSurvey || preAppSurvey.dailySpending === null) {
                return res.status(400).json({
                    error: "Pre-app survey data not found or daily spending not set",
                });
            }

            const baseAvg = Number(preAppSurvey.dailySpending);

            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            const dailyInvoices = await InvoiceRepo.createQueryBuilder("invoice")
                .where("invoice.userId = :userId", { userId })
                .andWhere("invoice.createdAt >= :startOfDay", { startOfDay })
                .andWhere("invoice.createdAt < :endOfDay", { endOfDay })
                .getMany();

            const dailyTotal = dailyInvoices.reduce(
                (sum, invoice) => sum + Number(invoice.grand_total || 0),
                0
            );

            const apiResponse = await axios.post(
                SPEND_API_URL,
                {
                    daily_total: dailyTotal,
                    base_avg: baseAvg,
                    weight: 0.2,
                    direction: "down",
                    sigma_r: 1.0,
                    alpha: 0.5,
                    ocean_score: preOceanScore,
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "Metric calculation failed",
                    details: apiResponse.data,
                });
            }

            const apiResult = AnalyzeResponseSchema.safeParse(apiResponse.data);
            if (!apiResult.success) {
                return res.status(500).json({
                    error: "Invalid response from API",
                    details: apiResult.error.errors,
                });
            }

            const result = apiResult.data;

            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await BigFiveRepo.save(bigFive);

            const ocean_metric_data: Record<string, any> = {
                preOcean: preOceanScore,
                newOcean: result.new_ocean_score,
                metricValue: {
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                },
                metadata: {
                    daily_total: dailyTotal,
                    base_avg: baseAvg,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason,
                },
            };

            const oceanMetrics = OceanMetricsRepo.create({
                userId,
                type: result.metric,
                data: ocean_metric_data,
            });
            await OceanMetricsRepo.save(oceanMetrics);

            return res.status(200).json({
                id: oceanMetrics.id,
                userId: oceanMetrics.userId,
                type: oceanMetrics.type,
                data: oceanMetrics.data,
                createdAt: oceanMetrics.createdAt,
                updatedAt: oceanMetrics.updatedAt,
            });
        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate metric",
                    details: e.response?.data || e.message,
                });
            }

            return res.status(500).json({
                error: "Failed to calculate metric",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public getAllByType = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const type = req.query.type as string;

            const records = await OceanMetricsRepo.find({
                where: { userId, type },
                order: { createdAt: "DESC" },
            });

            return res.status(200).json(records);
        } catch (e) {
            return res.status(500).json({
                error: "Failed to get ocean metrics",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public calculateSpendVariability = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            let bigFive = await BigFiveRepo.findOne({
                where: { user: { id: userId } },
            });

            if (!bigFive) {
                return res.status(400).json({
                    error: "User does not have OCEAN scores yet",
                });
            }

            const preOceanScore: z.infer<typeof OceanScoreSchema> = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism,
            };

            const preAppSurvey = await PreAppSurveyRepo.findOne({
                where: { userId },
            });

            if (!preAppSurvey || preAppSurvey.spendingVariation === null) {
                return res.status(400).json({
                    error: "Pre-app survey data not found or spending variation not set",
                });
            }

            const baseLikert = Number(preAppSurvey.spendingVariation);

            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const weeklyInvoices = await InvoiceRepo.createQueryBuilder("invoice")
                .where("invoice.userId = :userId", { userId })
                .andWhere("invoice.createdAt >= :sevenDaysAgo", { sevenDaysAgo })
                .andWhere("invoice.createdAt <= :today", { today })
                .getMany();

            // Group invoices theo ngày, ngày nào không có = 0
            const dailyTotals: number[] = new Array(7).fill(0);

            weeklyInvoices.forEach((invoice) => {
                const daysDiff = Math.floor(
                    (invoice.createdAt.getTime() - sevenDaysAgo.getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysDiff >= 0 && daysDiff < 7) {
                    dailyTotals[daysDiff] += Number(invoice.grand_total || 0);
                }
            });

            const dailySpend = dailyTotals;

            const apiResponse = await axios.post(
                VARIABILITY_API_URL,
                {
                    daily_spend: dailySpend,
                    base_likert: baseLikert,
                    weight: 0.2,
                    direction: "up",
                    sigma_r: 1.0,
                    alpha: 0.5,
                    ocean_score: preOceanScore,
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "Metric calculation failed",
                    details: apiResponse.data,
                });
            }

            const apiResult = AnalyzeResponseSchema.safeParse(apiResponse.data);
            if (!apiResult.success) {
                return res.status(500).json({
                    error: "Invalid response from API",
                    details: apiResult.error.errors,
                });
            }

            const result = apiResult.data;

            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await BigFiveRepo.save(bigFive);

            const ocean_metric_data: Record<string, any> = {
                preOcean: preOceanScore,
                newOcean: result.new_ocean_score,
                metricValue: {
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                },
                metadata: {
                    daily_spend: dailySpend,
                    base_likert: baseLikert,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason,
                },
            };

            const oceanMetrics = OceanMetricsRepo.create({
                userId,
                type: result.metric,
                data: ocean_metric_data,
            });
            await OceanMetricsRepo.save(oceanMetrics);

            return res.status(200).json({
                id: oceanMetrics.id,
                userId: oceanMetrics.userId,
                type: oceanMetrics.type,
                data: oceanMetrics.data,
                createdAt: oceanMetrics.createdAt,
                updatedAt: oceanMetrics.updatedAt,
            });
        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate metric",
                    details: e.response?.data || e.message,
                });
            }

            return res.status(500).json({
                error: "Failed to calculate metric",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public calculateDailyDistance = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            let bigFive = await BigFiveRepo.findOne({
                where: { user: { id: userId } },
            });

            if (!bigFive) {
                return res.status(400).json({
                    error: "User does not have OCEAN scores yet",
                });
            }

            const preOceanScore: z.infer<typeof OceanScoreSchema> = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism,
            };

            const preAppSurvey = await PreAppSurveyRepo.findOne({
                where: { userId },
            });

            if (!preAppSurvey || preAppSurvey.dailyDistance === null) {
                return res.status(400).json({
                    error: "Pre-app survey data not found or daily distance not set",
                });
            }

            const baseAvgDistance = Number(preAppSurvey.dailyDistance);

            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            const todayLocations = await LocationsRepo.createQueryBuilder("location")
                .where("location.userId = :userId", { userId })
                .andWhere("location.createdAt >= :startOfDay", { startOfDay })
                .andWhere("location.createdAt < :endOfDay", { endOfDay })
                .andWhere("location.lengthToPreviousLocation IS NOT NULL")
                .getMany();

            const distanceToday = todayLocations.reduce(
                (sum, loc) => sum + (loc.lengthToPreviousLocation || 0),
                0
            );

            const apiResponse = await axios.post(
                DISTANCE_API_URL,
                {
                    distance_today: distanceToday,
                    base_avg_distance: baseAvgDistance,
                    weight: 0.2,
                    direction: "up",
                    sigma_r: 1.0,
                    alpha: 0.5,
                    ocean_score: preOceanScore,
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "Metric calculation failed",
                    details: apiResponse.data,
                });
            }

            const apiResult = AnalyzeResponseSchema.safeParse(apiResponse.data);
            if (!apiResult.success) {
                return res.status(500).json({
                    error: "Invalid response from API",
                    details: apiResult.error.errors,
                });
            }

            const result = apiResult.data;

            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await BigFiveRepo.save(bigFive);

            const ocean_metric_data: Record<string, any> = {
                preOcean: preOceanScore,
                newOcean: result.new_ocean_score,
                metricValue: {
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                },
                metadata: {
                    distance_today: distanceToday,
                    base_avg_distance: baseAvgDistance,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason,
                },
            };

            const oceanMetrics = OceanMetricsRepo.create({
                userId,
                type: result.metric,
                data: ocean_metric_data,
            });
            await OceanMetricsRepo.save(oceanMetrics);

            return res.status(200).json({
                id: oceanMetrics.id,
                userId: oceanMetrics.userId,
                type: oceanMetrics.type,
                data: oceanMetrics.data,
                createdAt: oceanMetrics.createdAt,
                updatedAt: oceanMetrics.updatedAt,
            });
        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate metric",
                    details: e.response?.data || e.message,
                });
            }

            return res.status(500).json({
                error: "Failed to calculate metric",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };

    public calculateListAdherence = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            let bigFive = await BigFiveRepo.findOne({
                where: { user: { id: userId } },
            });

            if (!bigFive) {
                return res.status(400).json({
                    error: "User does not have OCEAN scores yet",
                });
            }

            const preOceanScore: z.infer<typeof OceanScoreSchema> = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism,
            };

            const preAppSurvey = await PreAppSurveyRepo.findOne({
                where: { userId },
            });

            if (!preAppSurvey || preAppSurvey.shoppingList === null) {
                return res.status(400).json({
                    error: "Pre-app survey data not found or shopping list not set",
                });
            }

            const baseLikert = Number(preAppSurvey.shoppingList);

            // Lấy tất cả todos (chỉ parent)
            const todos = await TodoRepo.createQueryBuilder("todo")
                .where("todo.user_id = :userId", { userId })
                .andWhere("todo.parent_id IS NULL")
                .getMany();

            const todosData = todos.map((todo) => ({
                task: todo.title,
                done: todo.completed,
            }));

            const apiResponse = await axios.post(
                LIST_ADHERENCE_API_URL,
                {
                    todos: todosData,
                    base_likert: baseLikert,
                    weight: 0.3,
                    direction: "up",
                    sigma_r: 1.0,
                    alpha: 0.5,
                    ocean_score: preOceanScore,
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (apiResponse.status !== 200) {
                return res.status(apiResponse.status).json({
                    error: "Metric calculation failed",
                    details: apiResponse.data,
                });
            }

            const apiResult = AnalyzeResponseSchema.safeParse(apiResponse.data);
            if (!apiResult.success) {
                return res.status(500).json({
                    error: "Invalid response from API",
                    details: apiResult.error.errors,
                });
            }

            const result = apiResult.data;

            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await BigFiveRepo.save(bigFive);

            const ocean_metric_data: Record<string, any> = {
                preOcean: preOceanScore,
                newOcean: result.new_ocean_score,
                metricValue: {
                    vt: result.vt,
                    bt: result.bt,
                    r: result.r,
                    n: result.n,
                    contrib: result.contrib,
                },
                metadata: {
                    todos: todosData,
                    base_likert: baseLikert,
                    mechanismFeedback: result.mechanismFeedback,
                    reason: result.reason,
                },
            };

            const oceanMetrics = OceanMetricsRepo.create({
                userId,
                type: result.metric,
                data: ocean_metric_data,
            });
            await OceanMetricsRepo.save(oceanMetrics);

            return res.status(200).json({
                id: oceanMetrics.id,
                userId: oceanMetrics.userId,
                type: oceanMetrics.type,
                data: oceanMetrics.data,
                createdAt: oceanMetrics.createdAt,
                updatedAt: oceanMetrics.updatedAt,
            });
        } catch (e) {
            if (axios.isAxiosError(e)) {
                return res.status(e.response?.status || 500).json({
                    error: "Failed to calculate metric",
                    details: e.response?.data || e.message,
                });
            }

            return res.status(500).json({
                error: "Failed to calculate metric",
                details: e instanceof Error ? e.message : String(e),
            });
        }
    };
}

export default new OceanMetricController();
