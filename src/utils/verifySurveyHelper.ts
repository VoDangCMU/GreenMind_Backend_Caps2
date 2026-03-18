import axios from "axios";
import AppDataSource from "../infrastructure/database";
import { Feedback } from "../entity/behavior_feedback";
import { Models } from "../entity/models";
import { User } from "../entity/user";
import { Segment } from "../entity/segments";
import { BigFive, BigFiveType } from "../entity/big_five";

const VERIFY_SURVEY_API_URL = "https://ai-greenmind.khoav4.com/verify-survey";

interface OceanScore {
    O: number;
    C: number;
    E: number;
    A: number;
    N: number;
}

interface VerifySurveyResult {
    model_id: string;
    user_id: string;
    trait_checked: string;
    expected: number;
    actual: number;
    deviation: number;
    engagement: number;
    match: boolean;
    level: string;
    feedback: string[];
}

/**
 * Tính tuổi từ ngày sinh
 */
function calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Normalize gender value để so sánh
 */
function normalizeGender(gender: string): string {
    const g = gender.toLowerCase().trim();
    if (g === 'nam' || g === 'male' || g === 'm') return 'male';
    if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') return 'female';
    return gender;
}

/**
 * Tìm trait OCEAN nào thay đổi so với trước
 */
function findChangedOceanTrait(
    oldScore: OceanScore | null,
    newScore: OceanScore
): keyof OceanScore | null {
    if (!oldScore) return 'O'; // Mặc định trả về O nếu chưa có score cũ

    const traits: (keyof OceanScore)[] = ['O', 'C', 'E', 'A', 'N'];
    let maxChange = 0;
    let changedTrait: keyof OceanScore | null = null;

    for (const trait of traits) {
        const change = Math.abs(newScore[trait] - oldScore[trait]);
        if (change > maxChange) {
            maxChange = change;
            changedTrait = trait;
        }
    }

    return changedTrait || 'O';
}

/**
 * Tìm model phù hợp dựa trên user info và OCEAN trait thay đổi
 */
async function findMatchingModelByOceanTrait(
    userAge: number,
    userGender: string,
    userLocation: string,
    oceanTrait: string
): Promise<Models | null> {
    const ModelsRepository = AppDataSource.getRepository(Models);

    // Tìm model thỏa mãn: age, gender, location và ocean trait
    const models = await ModelsRepository.find();

    if (models.length === 0) {
        return null;
    }

    let bestMatch: Models | null = null;
    let bestScore = -1;

    const normalizedUserGender = normalizeGender(userGender);
    const userLocationLower = userLocation.toLowerCase();

    for (const model of models) {
        let score = 0;

        // Match OCEAN trait (bắt buộc)
        if (model.ocean && model.ocean.toUpperCase().includes(oceanTrait.toUpperCase())) {
            score += 10; // Ưu tiên cao nhất
        } else {
            continue; // Bỏ qua model không có OCEAN trait cần tìm
        }

        // Match age
        if (model.age) {
            const modelAge = parseInt(model.age, 10);
            if (!isNaN(modelAge)) {
                // EXACT AGE MATCH ONLY - No tolerance
                if (modelAge === userAge) {
                    score += 10; // High priority for exact match
                }
            }
        }

        // Match location
        if (model.location) {
            const modelLocationLower = model.location.toLowerCase();
            if (userLocationLower.includes(modelLocationLower) || modelLocationLower.includes(userLocationLower)) {
                score += 2;
            }
        }

        // Match gender
        if (model.gender) {
            const normalizedModelGender = normalizeGender(model.gender);
            if (normalizedUserGender === normalizedModelGender) {
                score += 3;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = model;
        }
    }

    return bestMatch;
}

/**
 * Tìm hoặc tạo Segment dựa trên user info và modelId
 */
async function findOrCreateSegment(
    userAge: number,
    userGender: string,
    userLocation: string,
    modelId: string
): Promise<Segment> {
    const SegmentRepository = AppDataSource.getRepository(Segment);
    const BigFiveRepository = AppDataSource.getRepository(BigFive);

    const normalizedGender = normalizeGender(userGender);

    // Tìm segment đã tồn tại với age, gender, location
    let segment = await SegmentRepository.findOne({
        where: {
            modelId: modelId,
            location: userLocation,
            age: userAge,
            gender: normalizedGender
        }
    });

    if (!segment) {
        // Tạo segment mới với age thực tế thay vì ageRange
        segment = SegmentRepository.create({
            name: `${userLocation}_${userAge}_${normalizedGender}`,
            description: `Auto-generated segment for ${userLocation}, age ${userAge}, ${normalizedGender}`,
            location: userLocation,
            age: userAge,
            gender: normalizedGender,
            modelId: modelId,
            urban: false
        });
        segment = await SegmentRepository.save(segment);

        // Tạo BigFive record cho segment mới
        const bigFive = BigFiveRepository.create({
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.5,
            type: BigFiveType.SEGMENT,
            referenceId: segment.id
        });
        await BigFiveRepository.save(bigFive);
    }

    return segment;
}

/**
 * Cập nhật BigFive cho Segment
 */
async function updateSegmentBigFive(
    segmentId: string,
    oceanScore: OceanScore
): Promise<void> {
    const BigFiveRepository = AppDataSource.getRepository(BigFive);

    let bigFive = await BigFiveRepository.findOne({
        where: {
            type: BigFiveType.SEGMENT,
            referenceId: segmentId
        }
    });

    if (!bigFive) {
        bigFive = BigFiveRepository.create({
            openness: oceanScore.O,
            conscientiousness: oceanScore.C,
            extraversion: oceanScore.E,
            agreeableness: oceanScore.A,
            neuroticism: oceanScore.N,
            type: BigFiveType.SEGMENT,
            referenceId: segmentId
        });
    } else {
        bigFive.openness = oceanScore.O;
        bigFive.conscientiousness = oceanScore.C;
        bigFive.extraversion = oceanScore.E;
        bigFive.agreeableness = oceanScore.A;
        bigFive.neuroticism = oceanScore.N;
    }

    await BigFiveRepository.save(bigFive);
}

/**
 * Cập nhật BigFive cho User
 */
async function updateUserBigFive(
    userId: string,
    oceanScore: OceanScore
): Promise<void> {
    const BigFiveRepository = AppDataSource.getRepository(BigFive);
    const UserRepository = AppDataSource.getRepository(User);

    const user = await UserRepository.findOne({
        where: { id: userId },
        relations: { bigFive: true }
    });

    if (!user) {
        return;
    }

    let bigFive: BigFive | null = user.bigFive;

    if (!bigFive) {
        // Tìm BigFive theo type và referenceId
        bigFive = await BigFiveRepository.findOne({
            where: {
                type: BigFiveType.USER,
                referenceId: userId
            }
        });
    }

    if (!bigFive) {
        bigFive = BigFiveRepository.create({
            openness: oceanScore.O,
            conscientiousness: oceanScore.C,
            extraversion: oceanScore.E,
            agreeableness: oceanScore.A,
            neuroticism: oceanScore.N,
            type: BigFiveType.USER,
            referenceId: userId,
            user: user
        });
    } else {
        bigFive.openness = oceanScore.O;
        bigFive.conscientiousness = oceanScore.C;
        bigFive.extraversion = oceanScore.E;
        bigFive.agreeableness = oceanScore.A;
        bigFive.neuroticism = oceanScore.N;
    }

    await BigFiveRepository.save(bigFive);
}

/**
 * Gọi API verify-survey với OCEAN score mới và lưu feedback vào database
 * - Tìm/tạo Segment dựa trên user info (age, gender, location) và modelId
 * - Cập nhật BigFive cho Segment
 * - Cập nhật BigFive cho User
 * - Gọi API verify-survey
 * - Lưu feedback vào Segment
 *
 * @param userId - ID của user
 * @param oceanScore - OCEAN score mới sau khi cập nhật từ metric
 * @param metricName - Tên metric đang gọi (để logging)
 * @param previousOceanScore - OCEAN score trước đó (để xác định trait thay đổi)
 * @returns VerifySurveyResult hoặc null nếu có lỗi
 */
export async function verifySurveyAndSaveFeedback(
    userId: string,
    oceanScore: OceanScore,
    metricName: string,
    previousOceanScore?: OceanScore | null
): Promise<VerifySurveyResult | null> {
    try {
        const UserRepository = AppDataSource.getRepository(User);
        const FeedbackRepository = AppDataSource.getRepository(Feedback);

        // Lấy thông tin user
        const user = await UserRepository.findOne({
            where: { id: userId }
        });

        if (!user) {
            return null;
        }

        // Tính tuổi user
        const userAge = user.dateOfBirth ? calculateAge(user.dateOfBirth) : 25;
        const userGender = user.gender || 'unknown';
        const userLocation = user.location || 'unknown';

        // Tìm trait OCEAN thay đổi
        const changedTrait = findChangedOceanTrait(previousOceanScore || null, oceanScore);

        if (!changedTrait) {
            return null;
        }


        // Tìm model phù hợp với user info và OCEAN trait thay đổi
        const matchingModel = await findMatchingModelByOceanTrait(
            userAge,
            userGender,
            userLocation,
            changedTrait
        );

        if (!matchingModel) {
            return null;
        }


        // Tìm hoặc tạo Segment
        const segment = await findOrCreateSegment(
            userAge,
            userGender,
            userLocation,
            matchingModel.id
        );

        // Cập nhật BigFive cho Segment
        await updateSegmentBigFive(segment.id, oceanScore);

        // Cập nhật BigFive cho User (type: user, referenceId: userId)
        await updateUserBigFive(userId, oceanScore);

        // Chuẩn bị request data cho verify-survey API
        const verifyRequest = {
            model: {
                id: matchingModel.id,
                ocean: matchingModel.ocean,
                behavior: matchingModel.behavior,
                age: String(userAge),
                location: userLocation,
                gender: userGender,
                keywords: matchingModel.keywords
            },
            user_id: userId,
            survey_result: oceanScore
        };

        // Gọi API verify-survey
        const response = await axios.post(
            VERIFY_SURVEY_API_URL,
            verifyRequest,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const verifyResult = response.data;

        // Tính toán deviation và engagement theo công thức mới
        const calculatedDeviation = Math.abs(verifyResult.expected - verifyResult.actual);
        const calculatedEngagement = 1 - calculatedDeviation;

        // Lưu feedback vào database với segmentId
        const feedback = FeedbackRepository.create({
            type: 'survey_verify',
            modelId: verifyResult.model_id,
            segmentId: segment.id,
            userId: verifyResult.user_id,
            trait_checked: verifyResult.trait_checked,
            expected: verifyResult.expected,
            actual: verifyResult.actual,
            deviation: calculatedDeviation,
            match: verifyResult.match,
            level: verifyResult.level,
            feedback: verifyResult.feedback
        });

        await FeedbackRepository.save(feedback);

        // Return kết quả với deviation và engagement đã tính
        return {
            ...verifyResult,
            deviation: calculatedDeviation,
            engagement: calculatedEngagement
        };

    } catch (error) {
        console.error("Error calling verify-survey after metric update", error);
        return null;
    }
}
