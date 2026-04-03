import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { User } from "./user";

export const ENVIRONMENTAL_IMPACT_TABLE_NAME = "environmental_impact";

@Entity(ENVIRONMENTAL_IMPACT_TABLE_NAME)
export class EnvironmentalImpact {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ type: "uuid", name: "user_id" })
    userId!: string;

    // Date this record represents (day granularity)
    @Column({ type: "date", name: "record_date" })
    recordDate!: Date;

    // ── Pollution metrics (15 substances) ──────────────────────────────────
    @Column({ type: "double precision", default: 0 })
    co2!: number;

    @Column({ type: "double precision", default: 0 })
    dioxin!: number;

    @Column({ type: "double precision", default: 0 })
    microplastic!: number;

    @Column({ type: "double precision", name: "toxic_chemicals", default: 0 })
    toxicChemicals!: number;

    @Column({ type: "double precision", name: "non_biodegradable", default: 0 })
    nonBiodegradable!: number;

    @Column({ type: "double precision", default: 0 })
    nox!: number;

    @Column({ type: "double precision", default: 0 })
    so2!: number;

    @Column({ type: "double precision", default: 0 })
    ch4!: number;

    @Column({ type: "double precision", default: 0 })
    pm25!: number;

    @Column({ type: "double precision", default: 0 })
    pb!: number;

    @Column({ type: "double precision", default: 0 })
    hg!: number;

    @Column({ type: "double precision", default: 0 })
    cd!: number;

    @Column({ type: "double precision", default: 0 })
    nitrate!: number;

    @Column({ type: "double precision", name: "chemical_residue", default: 0 })
    chemicalResidue!: number;

    @Column({ type: "double precision", default: 0 })
    styrene!: number;

    // ── Aggregated impact categories ───────────────────────────────────────
    @Column({ type: "double precision", name: "air_pollution", default: 0 })
    airPollution!: number;

    @Column({ type: "double precision", name: "water_pollution", default: 0 })
    waterPollution!: number;

    @Column({ type: "double precision", name: "soil_pollution", default: 0 })
    soilPollution!: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt!: Date;
}
