import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './user';
import { Campaign } from './campaign';

@Entity('campaign_messages')
export class CampaignMessage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    campaignId!: string;

    @ManyToOne(() => Campaign, campaign => campaign.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'campaignId' })
    campaign!: Campaign;

    @Column({ type: 'uuid' })
    senderId!: string;

    @ManyToOne(() => User, user => user.campaignMessages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'senderId' })
    sender!: User;

    @Column({ type: 'text' })
    content!: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
