import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { User } from './user';

export const WASTE_REPORTS_TABLE_NAME = 'waste_reports';

export enum WasteReportStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    DONE = 'done',
}

export enum DETECT_TYPE {
    DETECT_TRASH = 'detect_trash',
    DETECT_POLLUTANT = 'predict_pollutant_impact'
}


@Entity(WASTE_REPORTS_TABLE_NAME)
@Index(['wardName', 'status'])
@Index(['assignedCollectorId', 'status'])
export class WasteReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', nullable: true })
    imageUrl?: string;

    @Column('double precision')
    lat!: number;

    @Column('double precision')
    lng!: number;

    @Column('float', { nullable: true })
    wasteKg?: number;

    @Index()
    @Column({ type: 'varchar', length: 100 })
    wardName!: string;

    @Column({ type: 'varchar', unique: true, nullable: true })
    code!: string;

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

    @Index()
    @Column({
        type: 'enum',
        enum: WasteReportStatus,
        default: WasteReportStatus.PENDING,
    })
    status!: WasteReportStatus;

    @Column({ type: 'uuid', nullable: true })
    reportedByUserId?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'reportedByUserId' })
    reportedBy?: User;

    @Column({ type: 'uuid', nullable: true })
    assignedCollectorId?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assignedCollectorId' })
    assignedCollector?: User;

    @Column({ type: 'text', nullable: true })
    imageEvidenceUrl?: string;

    @Column({ type: 'enum', enum: DETECT_TYPE, nullable: true })
    detectType?: DETECT_TYPE;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt?: Date;
}
