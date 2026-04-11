import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './user';
import { WasteReport } from './waste_report';
import { CampaignParticipant } from './campaign_participants'

export enum CampaignStatus {
    PENDING = 'PENDING',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'timestamp' })
    startDate!: Date;

    @Column({ type: 'timestamp' })
    endDate!: Date;

    @Column('double precision', { default: 500 })
    radius!: number;

    @Column('double precision')
    lat!: number;

    @Column('double precision')
    lng!: number;

    @Column({
        type: 'enum',
        enum: CampaignStatus,
        default: CampaignStatus.PENDING,
    })
    status!: CampaignStatus;

    @Column({ type: 'uuid', nullable: true })
    createdByUserId?: string;

    @ManyToOne(() => User, user => user.campaignsCreated, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'createdByUserId' })
    createdBy?: User;

    @OneToMany(() => WasteReport, (report: WasteReport) => report.campaign)
    reports!: WasteReport[];

    @OneToMany(() => CampaignParticipant, (participant: CampaignParticipant) => participant.campaign)
    participants!: CampaignParticipant[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
