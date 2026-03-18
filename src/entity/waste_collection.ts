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

export const WASTE_COLLECTIONS_TABLE_NAME = 'waste_collections';

export enum WasteCollectionStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

@Entity(WASTE_COLLECTIONS_TABLE_NAME)
export class WasteCollection {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    collectorId!: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collectorId' })
    collector!: User;

    @Column({ type: 'uuid', nullable: true })
    householdId?: string;

    @ManyToOne(() => Household, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'householdId' })
    household?: Household;

    @Column({ type: 'varchar', length: 50, default: WasteCollectionStatus.PENDING })
    status!: WasteCollectionStatus;

    @Column({ type: 'timestamp', nullable: true })
    collectedAt?: Date;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lat?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lng?: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
