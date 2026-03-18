import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { UrbanArea } from './urban_area';
import { User } from './user';

export const HOUSEHOLDS_TABLE_NAME = 'households';

@Entity(HOUSEHOLDS_TABLE_NAME)
export class Household {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    address!: string;

    @Column({ type: 'uuid', nullable: true })
    urbanAreaId?: string;

    @ManyToOne(() => UrbanArea, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'urbanAreaId' })
    urbanArea?: UrbanArea;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lat?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lng?: number;

    @OneToMany(() => User, user => (user as any).household, { nullable: true })
    members?: User[];
}
