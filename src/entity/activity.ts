import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user';
import { Household } from './household';

export const ACTIVITIES_TABLE_NAME = 'activities';

export enum ActivityType {
    WASTE_SORTING = 'WASTE_SORTING',
    WASTE_DISPOSAL = 'WASTE_DISPOSAL',
    GREEN_MEAL = 'GREEN_MEAL',
    ELECTRICITY_USAGE = 'ELECTRICITY_USAGE',
    REPORT_DUMP_SITE = 'REPORT_DUMP_SITE',
    REPORT_UNCOLLECTED_WASTE = 'REPORT_UNCOLLECTED_WASTE',
    BILL_UPLOAD = 'BILL_UPLOAD',
}

@Entity(ACTIVITIES_TABLE_NAME)
export class Activity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'uuid', nullable: true })
    householdId?: string;

    @ManyToOne(() => Household, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'householdId' })
    household?: Household;

    @Column({ type: 'varchar', length: 50 })
    activityType!: ActivityType;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    mediaUrl?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    location?: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
