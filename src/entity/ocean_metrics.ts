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

export const OCEAN_METRICS_TABLE_NAME = 'ocean_metrics';

@Entity(OCEAN_METRICS_TABLE_NAME)
@Index("idx_ocean_metrics_user_type", ["userId", "type"])
export class OceanMetrics {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    userId!: string;

    @Column({ type: "varchar", length: 100 })
    type!: string;

    @Column({ type: "jsonb" })
    data!: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;
}


