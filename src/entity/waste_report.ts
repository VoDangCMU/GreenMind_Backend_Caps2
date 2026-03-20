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

export const WASTE_REPORTS_TABLE_NAME = 'waste_reports';

export enum WasteReportStatus {
    PENDING = 'PENDING',
    ASSIGNED = 'ASSIGNED',
    RESOLVED = 'RESOLVED',
    REJECTED = 'REJECTED',
}

@Entity(WASTE_REPORTS_TABLE_NAME)
export class WasteReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    householdId!: string;

    @ManyToOne(() => Household, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'householdId' })
    household!: Household;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', nullable: true })
    imageKey?: string;

    @Column({ type: 'text', nullable: true })
    imageUrl?: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lat?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lng?: number;

    @Column({ type: 'varchar', length: 50, default: WasteReportStatus.PENDING })
    status!: WasteReportStatus;

    @Column({ type: 'uuid', nullable: true })
    assignedCollectorId?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assignedCollectorId' })
    assignedCollector?: User;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
