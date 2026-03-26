import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { User } from './user';
import { Ward } from './wards';

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
@Index(['wardId', 'status'])
export class WasteReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    householdId?: string;

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
    @Column({ type: 'int' })
    wardId!: number;

    @Index()
    @Column({
        type: 'enum',
        enum: WasteReportStatus,
        default: WasteReportStatus.PENDING,
    })
    status!: WasteReportStatus;

    @Column({ type: 'uuid', nullable: true })
    assignedCollectorId?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assignedCollectorId' })
    assignedCollector?: User;

    @ManyToOne(() => Ward, (ward) => ward.reports, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'wardId' })
    ward!: Ward;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt?: Date;
}
