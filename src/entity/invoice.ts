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

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string;

    // Doc info
    @Column({ type: 'varchar', length: 100, nullable: true })
    source_id?: string;

    @Column({ type: 'varchar', length: 10, default: 'VND' })
    currency!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    payment_method?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    // Vendor info
    @Column({ type: 'varchar', length: 255, nullable: true })
    vendor_name?: string;

    @Column({ type: 'text', nullable: true })
    vendor_address?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    vendor_geo_hint?: string;

    // Datetime
    @Column({ type: 'varchar', length: 20, nullable: true })
    invoice_date?: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    invoice_time?: string;

    // Items (stored as JSON)
    @Column({ type: 'jsonb' })
    items!: any[];

    // Totals
    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    subtotal?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 })
    discount?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 })
    tax?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    grand_total!: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
