import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import { Household } from "./household";
import { User } from "./user";
export enum DETECT_TYPE {
    DETECT_TRASH = 'detect_trash',
    PREDICT_POLLUTANT = 'predict_pollutant_impact'
}
const WASTE_DETECTION_TABLE_NAME = 'waste_detection';

@Entity(WASTE_DETECTION_TABLE_NAME)
export class WasteDetection {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text', nullable: true })
    imageUrl?: string;

    @Column({ type: 'jsonb', nullable: true })
    items?: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    pollution?: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    impact?: Record<string, any>;

    @Column({ type: 'integer', nullable: true })
    totalObjects?: number;

    @Column({ type: 'text', nullable: true })
    aiAnalysis?: string;

    @Column({ type: 'varchar', nullable: true })
    householdId?: string;

    @ManyToOne(() => Household, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'householdId' })
    household?: Household;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    detectedBy?: User;

    @Column({ type: 'enum', enum: DETECT_TYPE, nullable: true })
    detectType?: DETECT_TYPE;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

}