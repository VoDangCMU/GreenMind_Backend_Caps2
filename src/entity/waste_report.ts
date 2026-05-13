import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { User } from './user';
import { Campaign } from './campaign';

export const WASTE_REPORTS_TABLE_NAME = 'waste_reports';

export enum WasteReportStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    DONE = 'done',
}

@Entity(WASTE_REPORTS_TABLE_NAME)
@Index(['wardName', 'status'])
export class WasteReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    code!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', nullable: true })
    imageUrl?: string;

    @Column({ type: 'text', nullable: true })
    segmentedImageUrl?: string;

    @Column({ type: 'text', nullable: true })
    depthImageUrl?: string;

    @Column({ type: 'text', nullable: true })
    heatmapUrl?: string;

    @Column('double precision', { nullable: true })
    segmentRatio?: number;

    @Column('double precision', { nullable: true })
    pollutionScore?: number;

    @Column({ type: 'text', nullable: true })
    pollutionLevel?: string;

    @Column('double precision')
    lat!: number;

    @Column('double precision')
    lng!: number;

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

    @Column({ type: 'text', nullable: true })
    imageEvidenceUrl?: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt?: Date;

    @Column({ type: 'uuid', nullable: true })
    campaignId?: string;

    @ManyToOne(() => Campaign, (campaign: Campaign) => campaign.reports, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'campaignId' })
    campaign?: Campaign;
}