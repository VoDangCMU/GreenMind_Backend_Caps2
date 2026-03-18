import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { User } from "./user";

export const PRE_APP_SURVEY_TABLE_NAME = "pre_app_survey";

@Entity(PRE_APP_SURVEY_TABLE_NAME)
export class PreAppSurvey {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @OneToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ name: "user_id", type: "uuid", unique: true })
    userId!: string;

    // 1. avg_daily_spend - Chi tiêu hàng ngày trung bình
    @Column({ name: "daily_spending", type: "numeric", nullable: true })
    dailySpending!: number | null;

    @Column({ name: "daily_spending_sigmoid", type: "numeric", nullable: true })
    dailySpendingSigmoid!: number | null;

    @Column({ name: "daily_spending_weight", type: "numeric", nullable: true })
    dailySpendingWeight!: number | null;

    @Column({ name: "daily_spending_direction", type: "varchar", nullable: true })
    dailySpendingDirection!: string | null;

    @Column({ name: "daily_spending_alpha", type: "numeric", nullable: true })
    dailySpendingAlpha!: number | null;

    // 2. spend_variability - Biến động chi tiêu (Likert 5)
    @Column({ name: "spending_variation", type: "int", nullable: true })
    spendingVariation!: number | null;

    @Column({ name: "spending_variation_sigmoid", type: "numeric", nullable: true })
    spendingVariationSigmoid!: number | null;

    @Column({ name: "spending_variation_weight", type: "numeric", nullable: true })
    spendingVariationWeight!: number | null;

    @Column({ name: "spending_variation_direction", type: "varchar", nullable: true })
    spendingVariationDirection!: string | null;

    @Column({ name: "spending_variation_alpha", type: "numeric", nullable: true })
    spendingVariationAlpha!: number | null;

    // 3. brand_novel - Thử thương hiệu mới (Likert 5)
    @Column({ name: "brand_trial", type: "int", nullable: true })
    brandTrial!: number | null;

    @Column({ name: "brand_trial_sigmoid", type: "numeric", nullable: true })
    brandTrialSigmoid!: number | null;

    @Column({ name: "brand_trial_weight", type: "numeric", nullable: true })
    brandTrialWeight!: number | null;

    @Column({ name: "brand_trial_direction", type: "varchar", nullable: true })
    brandTrialDirection!: string | null;

    @Column({ name: "brand_trial_alpha", type: "numeric", nullable: true })
    brandTrialAlpha!: number | null;

    // 4. list_adherence - Tuân thủ danh sách mua sắm (Likert 5)
    @Column({ name: "shopping_list", type: "int", nullable: true })
    shoppingList!: number | null;

    @Column({ name: "shopping_list_sigmoid", type: "numeric", nullable: true })
    shoppingListSigmoid!: number | null;

    @Column({ name: "shopping_list_weight", type: "numeric", nullable: true })
    shoppingListWeight!: number | null;

    @Column({ name: "shopping_list_direction", type: "varchar", nullable: true })
    shoppingListDirection!: string | null;

    @Column({ name: "shopping_list_alpha", type: "numeric", nullable: true })
    shoppingListAlpha!: number | null;

    // 5. daily_distance_km - Quãng đường đi mỗi ngày (km)
    @Column({ name: "daily_distance", type: "numeric", nullable: true })
    dailyDistance!: number | null;

    @Column({ name: "daily_distance_sigmoid", type: "numeric", nullable: true })
    dailyDistanceSigmoid!: number | null;

    @Column({ name: "daily_distance_weight", type: "numeric", nullable: true })
    dailyDistanceWeight!: number | null;

    @Column({ name: "daily_distance_direction", type: "varchar", nullable: true })
    dailyDistanceDirection!: string | null;

    @Column({ name: "daily_distance_alpha", type: "numeric", nullable: true })
    dailyDistanceAlpha!: number | null;

    // 6. novel_location_ratio - Tỷ lệ địa điểm mới (Likert 5)
    @Column({ name: "new_places", type: "int", nullable: true })
    newPlaces!: number | null;

    @Column({ name: "new_places_sigmoid", type: "numeric", nullable: true })
    newPlacesSigmoid!: number | null;

    @Column({ name: "new_places_weight", type: "numeric", nullable: true })
    newPlacesWeight!: number | null;

    @Column({ name: "new_places_direction", type: "varchar", nullable: true })
    newPlacesDirection!: string | null;

    @Column({ name: "new_places_alpha", type: "numeric", nullable: true })
    newPlacesAlpha!: number | null;

    // 7. public_transit_ratio - Tỷ lệ sử dụng phương tiện công cộng (Likert 5)
    @Column({ name: "public_transport", type: "int", nullable: true })
    publicTransport!: number | null;

    @Column({ name: "public_transport_sigmoid", type: "numeric", nullable: true })
    publicTransportSigmoid!: number | null;

    @Column({ name: "public_transport_weight", type: "numeric", nullable: true })
    publicTransportWeight!: number | null;

    @Column({ name: "public_transport_direction", type: "varchar", nullable: true })
    publicTransportDirection!: string | null;

    @Column({ name: "public_transport_alpha", type: "numeric", nullable: true })
    publicTransportAlpha!: number | null;

    // 8. stable_schedule - Lịch trình ổn định (Likert 5)
    @Column({ name: "stable_schedule", type: "int", nullable: true })
    stableSchedule!: number | null;

    @Column({ name: "stable_schedule_sigmoid", type: "numeric", nullable: true })
    stableScheduleSigmoid!: number | null;

    @Column({ name: "stable_schedule_weight", type: "numeric", nullable: true })
    stableScheduleWeight!: number | null;

    @Column({ name: "stable_schedule_direction", type: "varchar", nullable: true })
    stableScheduleDirection!: string | null;

    @Column({ name: "stable_schedule_alpha", type: "numeric", nullable: true })
    stableScheduleAlpha!: number | null;

    // 9. night_out_freq - Tần suất ra ngoài ban đêm (số lần/tuần)
    @Column({ name: "night_outings", type: "int", nullable: true })
    nightOutings!: number | null;

    @Column({ name: "night_outings_sigmoid", type: "numeric", nullable: true })
    nightOutingsSigmoid!: number | null;

    @Column({ name: "night_outings_weight", type: "numeric", nullable: true })
    nightOutingsWeight!: number | null;

    @Column({ name: "night_outings_direction", type: "varchar", nullable: true })
    nightOutingsDirection!: string | null;

    @Column({ name: "night_outings_alpha", type: "numeric", nullable: true })
    nightOutingsAlpha!: number | null;

    // 10. healthy_food_ratio - Tỷ lệ thực phẩm lành mạnh (Likert 5)
    @Column({ name: "healthy_eating", type: "int", nullable: true })
    healthyEating!: number | null;

    @Column({ name: "healthy_eating_sigmoid", type: "numeric", nullable: true })
    healthyEatingSigmoid!: number | null;

    @Column({ name: "healthy_eating_weight", type: "numeric", nullable: true })
    healthyEatingWeight!: number | null;

    @Column({ name: "healthy_eating_direction", type: "varchar", nullable: true })
    healthyEatingDirection!: string | null;

    @Column({ name: "healthy_eating_alpha", type: "numeric", nullable: true })
    healthyEatingAlpha!: number | null;

    // Additional fields
    @Column({ name: "social_media", type: "int", nullable: true })
    socialMedia!: number | null;

    @Column({ name: "goal_setting", type: "int", nullable: true })
    goalSetting!: number | null;

    @Column({ name: "mood_swings", type: "int", nullable: true })
    moodSwings!: number | null;

    @Column({ name: "is_completed", type: "boolean", default: false })
    isCompleted!: boolean;

    @Column({ name: "completed_at", type: "timestamp", nullable: true })
    completedAt!: Date | null;

    @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
    updatedAt!: Date;
}
