import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import { User } from "./user";

export const PLANT_ANALYSIS_TABLE_NAME = 'plant_analysis';

@Entity(PLANT_ANALYSIS_TABLE_NAME)
@Index("idx_plant_analysis_user", ["userId"])
export class PlantAnalysis {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    userId!: string;

    @Column({ type: "float" })
    vegetableArea!: number;

    @Column({ type: "float" })
    dishArea!: number;

    @Column({ type: "float" })
    vegetableRatioPercent!: number;

    @Column({ type: "text" })
    plantImageUrl!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}