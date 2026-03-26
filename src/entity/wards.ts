import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { WasteReport } from './waste_report';

export const WARDS_TABLE_NAME = 'wards';

@Entity(WARDS_TABLE_NAME)
export class Ward {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column('double precision')
    lat!: number;

    @Column('double precision')
    lng!: number;

    @Column('jsonb')
    bounds!: Array<[number, number]>;

    @OneToMany(() => WasteReport, (report) => report.ward)
    reports!: WasteReport[];
}