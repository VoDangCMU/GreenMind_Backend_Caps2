import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

export const BEHAVIORS_TABLE_NAME = 'behaviors';

@Entity(BEHAVIORS_TABLE_NAME)
export class Behavior {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({type: 'text'})
    name!: string;

    @Column({type: 'text'})
    type!: string;

    @Column({type: 'text', array: true})
    keywords!: string[];

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date;

    @Column({type: 'text', nullable: true} )
    description?: string;

}