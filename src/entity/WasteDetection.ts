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
    PREDICT_POLLUTANT = 'predict_pollutant_impact',
    TOTAL_MASS = 'total_mass',
    ANALYZE_ALL = 'analyze_all'
}

export enum STATUS {
    DETECTED = 'detected',
    BROUGHT_OUT = 'brought_out',
    PICKED_UP = 'picked_up'
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

    @Column({ type: 'double precision', nullable: true })
    totalMassKg?: number;

    @Column({ type: 'text', nullable: true })
    annotatedImageUrl?: string;

    @Column({ type: 'text', nullable: true })
    depthMapUrl?: string;

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

    @Column({ type: 'enum', enum: STATUS, nullable: true })
    status!: STATUS;

    @Column({ type: 'text', nullable: true })
    pickupProofImageUrl?: string;

    @Column({ type: 'uuid', nullable: true })
    collectorId?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'collectorId' })
    collectedBy?: User;

    @Column({ type: 'timestamp', nullable: true })
    pickedUpAt?: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

}