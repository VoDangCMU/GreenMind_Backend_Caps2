import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    OneToOne,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Locations } from "./locations";
import { BigFive } from "./big_five";
import { Segment } from "./segments";
import { Role } from "./role";
import { Household } from './household';

export enum UserRole {
    HOUSEHOLD = 'household',
    COLLECTOR = 'collector',
    ADMIN = 'admin',
    USER = 'user',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToMany(() => Locations, location => location.user)
    locations!: Locations[];

    @Column({ type: 'varchar', length: 255, unique: true })
    username!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email?: string;

    @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
    phoneNumber?: string;

    @Column({ type: 'varchar', length: 255, select: false })
    password!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    fullName!: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    gender!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    location?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    region?: string;

    @Column({ type: 'varchar', length: 50, nullable: true, default: UserRole.USER })
    role!: string;

    @Column({ type: 'integer', nullable: true })
    roleId?: number;

    @ManyToOne(() => Role, role => role.users, { nullable: true, eager: false })
    @JoinColumn({ name: 'roleId' })
    roleRef?: Role;

    @Column({ type: 'uuid', nullable: true })
    householdId?: string;

    @ManyToOne(() => Household, household => household.members, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'householdId' })
    household?: Household | null;

    @Column({ type: 'timestamp' })
    dateOfBirth!: Date;

    @ManyToOne(() => Segment, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'segmentId' })
    segment?: Segment;

    @Column({ type: 'uuid', nullable: true })
    segmentId?: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date

    @OneToOne(() => BigFive, bigFive => bigFive.user)
    bigFive!: BigFive;
}