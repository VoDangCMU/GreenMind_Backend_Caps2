import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { User } from './user';

export const WASTE_REPORTS_TABLE_NAME = 'waste_reports';

export enum WasteReportStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    DONE = 'done',
}

export enum WasteType {
    PLASTIC = 'plastic',
    ORGANIC = 'organic',
    MIXED = 'mixed',
    HAZARDOUS = 'hazardous',
}

@Entity(WASTE_REPORTS_TABLE_NAME)
@Index(['wardName', 'status'])
@Index(['assignedCollectorId', 'status'])
export class WasteReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    code!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', nullable: true })
    imageKey?: string;

    @Column({ type: 'text', nullable: true })
    imageUrl?: string;

    @Column('double precision')
    lat!: number;

    @Column('double precision')
    lng!: number;

    @Column('float', { nullable: true })
    wasteKg?: number;

    @Column({
        type: 'enum',
        enum: WasteType,
    })
    wasteType!: WasteType;

    @Index()
    @Column({ type: 'varchar', length: 100 })
    wardName!: string;

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

    @Column({ type: 'text', default: '' })
    imageEvidenceUrl!: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt?: Date;
}
