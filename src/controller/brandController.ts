import { Request, Response, RequestHandler } from "express";
import AppDataSource from "../infrastructure/database";
import { Brand } from "../entity/brands";
import { Metrics } from "../entity/metrics";
import { BigFive } from "../entity/big_five";
import axios from "axios";

interface BrandNoveltyResponse {
    metric: string;
    vt: number;
    bt: number;
    r: number;
    n: number;
    contrib: number;
    new_ocean_score: {
        O: number;
        C: number;
        E: number;
        A: number;
        N: number;
    };
}

class BrandController {
    /**
     * Post brand - Add brands for user
     * POST /api/brands
     * Body: { brand: string | string[] }
     */
    public postBrand: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { brand } = req.body;

        if (!brand) {
            res.status(400).json({ message: "Brand is required" });
            return;
        }

        // Normalize brand to array
        const brandsToAdd: string[] = Array.isArray(brand) ? brand : [brand];

        try {
            const brandRepository = AppDataSource.getRepository(Brand);

            // Get the latest brand record for the user
            const latestBrand = await brandRepository.findOne({
                where: { userId },
                order: { startDay: 'DESC' }
            });

            const currentDate = new Date();
            let shouldCreateNewRecord = true;
            let updatedBrand: Brand;

            if (latestBrand) {
                // Calculate days difference
                const daysDiff = Math.floor(
                    (currentDate.getTime() - latestBrand.startDay.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysDiff <= 7) {
                    // Add to existing record
                    latestBrand.brands = [...latestBrand.brands, ...brandsToAdd];
                    updatedBrand = await brandRepository.save(latestBrand);
                    shouldCreateNewRecord = false;
                } else {
                    // Create new record
                    shouldCreateNewRecord = true;
                }
            }

            if (shouldCreateNewRecord) {
                // Create new record
                const newBrand = brandRepository.create({
                    userId,
                    brands: brandsToAdd,
                    startDay: currentDate
                });
                updatedBrand = await brandRepository.save(newBrand);
            }

            // Check if we need to process brand novelty (if >= 7 days have passed)
            if (shouldCreateNewRecord && latestBrand) {
                const daysSinceLatest = Math.floor(
                    (currentDate.getTime() - latestBrand.startDay.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysSinceLatest >= 7) {
                    // Get the 2 most recent records (including the new one)
                    const recentRecords = await brandRepository.find({
                        where: { userId },
                        order: { startDay: 'DESC' },
                        take: 2
                    });

                    if (recentRecords.length === 2) {
                        const brandNow = recentRecords[0].brands; // newest
                        const brandsPrev = recentRecords[1].brands; // older

                        // Process brand novelty
                        const noveltyResult = await this.processBrandNovelty(
                            userId,
                            brandsPrev,
                            brandNow
                        );

                        if (noveltyResult) {
                            res.status(200).json(noveltyResult);
                            return;
                        }
                    }
                }
            }

            res.status(200).json({
                message: "Brand added successfully",
                data: updatedBrand!
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Process brand novelty calculation
     */
    private async processBrandNovelty(
        userId: string,
        brandsPrev: string[],
        brandsNow: string[]
    ): Promise<BrandNoveltyResponse | null> {

        try {
            const metricsRepository = AppDataSource.getRepository(Metrics);
            const bigFiveRepository = AppDataSource.getRepository(BigFive);

            // Get or create base_likert from metrics
            let metricsRecord = await metricsRepository.findOne({
                where: { userId, type: 'brand_novelty' },
                order: { createdAt: 'DESC' }
            });

            let baseLikert = 3; // default
            if (metricsRecord && metricsRecord.metadata && metricsRecord.metadata.base_likert) {
                baseLikert = metricsRecord.metadata.base_likert;
            }

            // Get ocean_score from big_five
            const bigFive = await bigFiveRepository.findOne({
                where: { user: { id: userId } },
                relations: ['user']
            });

            if (!bigFive) {
                return null;
            }

            const oceanScore = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism
            };

            // Call AI API
            const requestData = {
                brands_prev: brandsPrev,
                brands_now: brandsNow,
                base_likert: baseLikert,
                weight: 0.2,
                direction: "up",
                sigma_r: 1.0,
                alpha: 0.5,
                ocean_score: oceanScore
            };

            const response = await axios.post<BrandNoveltyResponse>(
                'https://ai-greenmind.khoav4.com/brand_novelty',
                requestData,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const result = response.data;

            // Save to metrics table
            const newMetrics = metricsRepository.create({
                userId,
                type: 'brand_novelty',
                vt: result.vt,
                bt: result.bt,
                r: result.r,
                n: result.n,
                contrib: result.contrib,
                metadata: { base_likert: baseLikert }
            });

            await metricsRepository.save(newMetrics);

            // Update big_five table
            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await bigFiveRepository.save(bigFive);


            // Return exact format as API response
            return {
                metric: result.metric,
                vt: result.vt,
                bt: result.bt,
                r: result.r,
                n: result.n,
                contrib: result.contrib,
                new_ocean_score: result.new_ocean_score
            };
        } catch (error) {
            return null;
        }
    }
}

export default new BrandController();