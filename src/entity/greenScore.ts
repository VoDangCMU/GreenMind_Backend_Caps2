import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Household } from "./household";

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

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

}