import AppDataSource from "../infrastructure/database";
import { Models } from "../entity/models";
import { User } from "../entity/user";

const ModelsRepository = AppDataSource.getRepository(Models);
const UserRepository = AppDataSource.getRepository(User);

/**
 * Tìm model phù hợp với user dựa trên age, location, gender
 * @param userId - ID của user
 * @returns Model phù hợp hoặc null nếu không tìm thấy
 */
export async function findMatchingModel(userId: string): Promise<Models | null> {
    try {
        // Lấy thông tin user
        const user = await UserRepository.findOne({
            where: { id: userId }
        });

        if (!user) {
            return null;
        }

        // Tính tuổi từ dateOfBirth
        let userAge: number | null = null;
        if (user.dateOfBirth) {
            const today = new Date();
            const birthDate = new Date(user.dateOfBirth);
            userAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                userAge--;
            }
        }

        const userLocation = user.location?.toLowerCase() || '';
        const userGender = user.gender?.toLowerCase() || '';

        // Lấy tất cả models
        const models = await ModelsRepository.find();

        if (models.length === 0) {
            return null;
        }

        // Tính điểm matching cho mỗi model
        let bestMatch: Models | null = null;
        let bestScore = -1;

        for (const model of models) {
            let score = 0;

            // Match age (cho điểm nếu tuổi gần nhau)
            if (userAge !== null && model.age) {
                const modelAge = parseInt(model.age, 10);
                if (!isNaN(modelAge)) {
                    const ageDiff = Math.abs(userAge - modelAge);
                    if (ageDiff <= 2) score += 3; // Rất gần
                    else if (ageDiff <= 5) score += 2; // Gần
                    else if (ageDiff <= 10) score += 1; // Tương đối gần
                }
            }

            // Match location (cho điểm nếu location chứa cùng từ khóa)
            if (userLocation && model.location) {
                const modelLocation = model.location.toLowerCase();
                const userLocationParts = userLocation.split(/[,\s]+/).filter(p => p.length > 2);
                const modelLocationParts = modelLocation.split(/[,\s]+/).filter(p => p.length > 2);

                for (const userPart of userLocationParts) {
                    for (const modelPart of modelLocationParts) {
                        if (userPart.includes(modelPart) || modelPart.includes(userPart)) {
                            score += 2;
                            break;
                        }
                    }
                }
            }

            // Match gender (cho điểm nếu giới tính khớp)
            if (userGender && model.gender) {
                const modelGender = model.gender.toLowerCase();
                const normalizedUserGender = normalizeGender(userGender);
                const normalizedModelGender = normalizeGender(modelGender);

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
    } catch (error) {
        console.error("Error finding matching model", error);
        return null;
    }
}

/**
 * Normalize gender value để so sánh
 */
function normalizeGender(gender: string): string {
    const g = gender.toLowerCase().trim();
    if (g === 'nam' || g === 'male' || g === 'm') return 'male';
    if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') return 'female';
    return g;
}