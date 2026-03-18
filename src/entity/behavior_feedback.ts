import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './user';
import { Models } from './models';
import { Segment } from './segments';

@Entity('behavior_feedbacks')
export class BehaviorFeedback {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 50, default: 'behavior_mechanism' })
    type!: string; // 'behavior_mechanism' or 'survey_verify'

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user?: User;

    @Column({ type: 'uuid', name: 'user_id', nullable: true })
    userId?: string;

    @ManyToOne(() => Models, { nullable: true })
    @JoinColumn({ name: 'model_id' })
    model?: Models;

    @Column({ type: 'uuid', name: 'model_id', nullable: true })
    modelId?: string;

    @ManyToOne(() => Segment, { nullable: true })
    @JoinColumn({ name: 'segment_id' })
    segment?: Segment;

    @Column({ type: 'uuid', name: 'segment_id', nullable: true })
    segmentId?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    metric?: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    vt?: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    bt?: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    r?: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    n?: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    contrib?: number;

    @Column({ type: 'jsonb', nullable: true })
    mechanismFeedback?: {
        awareness: string;
        motivation: string;
        capability: string;
        opportunity: string;
    };

    @Column({ type: 'text', nullable: true })
    reason?: string;

    @Column({ type: 'jsonb', nullable: true })
    oceanScore?: {
        O: number;
        C: number;
        E: number;
        A: number;
        N: number;
    };

    // Survey verify fields (merged from feedbacks table)
    @Column({ type: 'varchar', length: 10, nullable: true })
    trait_checked?: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    expected?: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    actual?: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    deviation?: number;

    @Column({ type: 'boolean', nullable: true })
    match?: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true })
    level?: string;

    @Column({ type: 'jsonb', nullable: true })
    feedback?: string[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

// Backward-compatible alias
export { BehaviorFeedback as Feedback };