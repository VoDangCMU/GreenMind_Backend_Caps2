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
import { Household } from './household';

export enum TRANSACTION_STATUS {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    @ManyToOne(() => Household, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'household_id' })
    household?: Household;

    @Column({ type: 'uuid', name: 'household_id', nullable: true })
    householdId?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripeSessionId?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripePaymentIntentId?: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount!: number;

    @Column({ type: 'integer' })
    month!: number;

    @Column({ type: 'integer' })
    year!: number;

    @Column({ type: 'varchar', length: 255 })
    billName!: string;

    @Column({ type: 'double precision', nullable: true })
    totalMassKg?: number;

    @Column({ type: 'integer', default: 500 })
    ratePerKg!: number;

    @Column({ type: 'integer', default: 0 })
    recordCount!: number;

    @Column({ type: 'varchar', length: 50, default: 'pending' })
    status!: TRANSACTION_STATUS;

    @Column({ type: 'timestamp', nullable: true })
    paidAt?: Date;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
