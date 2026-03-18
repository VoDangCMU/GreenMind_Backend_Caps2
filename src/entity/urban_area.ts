import {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Household } from './household';

export const URBAN_AREAS_TABLE_NAME = 'urban_areas';

@Entity(URBAN_AREAS_TABLE_NAME)
export class UrbanArea {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 255 })
    city!: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lat?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    lng?: number;

    @OneToMany(() => Household, household => household.urbanArea)
    households?: Household[];
}
