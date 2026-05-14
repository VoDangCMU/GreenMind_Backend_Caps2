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
import { Campaign } from './campaign';

export enum ParticipantStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CHECKED_IN = 'CHECKED_IN',
    COMPLETED = 'COMPLETED'
}

@Entity('campaign_participants')
export class CampaignParticipant {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    campaignId!: string;

    @ManyToOne(() => Campaign, (campaign: Campaign) => campaign.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'campaignId' })
    campaign!: Campaign;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, (user: User) => user.campaignsParticipated, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'timestamp', nullable: true })
    checkInTime?: Date;

    @Column('double precision', { nullable: true })
    checkInLat?: number;

    @Column('double precision', { nullable: true })
    checkInLng?: number;

    @Column({ type: 'timestamp', nullable: true })
    checkOutTime?: Date;

    @Column('double precision', { nullable: true })
    checkOutLat?: number;

    @Column('double precision', { nullable: true })
    checkOutLng?: number;

    @Column({
        type: 'enum',
        enum: ParticipantStatus,
        default: ParticipantStatus.PENDING,
    })
    status!: ParticipantStatus;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
