import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn} from 'typeorm';
import {Behavior} from './behaviors';

@Entity('models')
export class Models {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({type: 'text'})
    ocean!: string;

    @Column({type: 'text'})
    behavior!: string;

    @Column({type: 'text', nullable: true})
    keyword?: string;

    @Column({type: 'text', nullable: true})
    setting?: string;

    @Column({type: 'text', nullable: true})
    event?: string;

    @Column({type: 'text'})
    age!: string;

    @Column({type: 'text'})
    location!: string;

    @Column({type: 'text'})
    gender!: string;

    @Column({type: 'text'})
    keywords!: string;

    @Column({type: 'boolean', default: false})
    urban!: boolean;

    @ManyToOne(() => Behavior, {nullable: true})
    @JoinColumn({name: 'behavior_id'})
    behaviorEntity?: Behavior;

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date;
}