import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Household } from "./household";
import { WasteDetection } from "./WasteDetection";

const GREN_SCORE_TABLE_NAME = 'green_score';

@Entity(GREN_SCORE_TABLE_NAME)
export class GreenScore {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'double precision', nullable: false })
    previousScore!: number;

    @Column({ type: 'double precision', nullable: false })
    delta!: number;

    @Column({ type: 'double precision', nullable: false, default: 50 })
    finalScore!: number;

    @Column({ type: 'varchar', nullable: true })
    householdId?: string;

    @Column({ type: 'jsonb', nullable: true })
    items?: Record<string, any>;

    @Column({ type: 'simple-array', nullable: true })
    reasons?: string[];

    @ManyToOne(() => Household, { nullable: true, onDelete: 'SET NULL' })
    household?: Household;

    @OneToOne(() => WasteDetection, wasteDetection => wasteDetection.greenScore)
    @JoinColumn({ name: 'wasteDetectionId' })
    wasteDetection?: WasteDetection;

    @Column({ type: 'uuid', nullable: true })
    wasteDetectionId?: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

}