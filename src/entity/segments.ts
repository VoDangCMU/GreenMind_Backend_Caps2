import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Models} from "./models";
import {User} from "./user";

export const SEGMENTS_TABLE_NAME = 'segments';

@Entity(SEGMENTS_TABLE_NAME)
export class Segment {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({type: 'varchar', length: 255})
    name!: string;

    @Column({type: 'text', nullable: true})
    description?: string;

    @Column({type: 'int', nullable: true})
    age?: number;

    @Column({type: 'varchar', length: 20, nullable: true})
    gender?: string;

    @Column({type: 'text', nullable: true})
    location?: string;

    @Column({type: 'boolean', default: false})
    urban!: boolean;

    @ManyToOne(() => Models, {nullable: false, onDelete: 'CASCADE'})
    @JoinColumn({name: 'modelId', referencedColumnName: 'id'})
    model!: Models;

    @Column({type: 'uuid'})
    modelId!: string;

    @OneToMany(() => User, user => user.segment)
    users!: User[];

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date;
}