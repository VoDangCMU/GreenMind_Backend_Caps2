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
import {Locations} from "./locations";
import {BigFive} from "./big_five";
import {Segment} from "./segments";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToMany(() => Locations, location => location.user)
    locations!: Locations[];

    @Column({type: 'varchar', length: 255, unique: true})
    username!: string;

    @Column({type: 'varchar', length: 255, unique: true})
    email?: string;

    @Column({type: 'varchar', length: 20, nullable: true, unique: true})
    phoneNumber?: string;

    @Column({type: 'varchar', length: 255, select: false})
    password!: string;

    @Column({type: 'varchar', length: 100, nullable: true})
    fullName!: string;

    @Column({type: 'varchar', length: 10, nullable: true})
    gender!: string;

    @Column({type: 'varchar', length: 50, nullable: true})
    location?: string;

    @Column({type: 'varchar', length: 50, nullable: true})
    region?: string;

    @Column({type: 'varchar', length: 50, nullable: true})
    role!: string;

    @Column({type: 'timestamp'})
    dateOfBirth!: Date;

    @ManyToOne(() => Segment, {nullable: true, onDelete: 'SET NULL'})
    @JoinColumn({name: 'segmentId'})
    segment?: Segment;

    @Column({type: 'uuid', nullable: true})
    segmentId?: string;

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date

    @OneToOne(() => BigFive, bigFive => bigFive.user)
    bigFive!: BigFive;
}