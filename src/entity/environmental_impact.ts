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

    // Pollution metrics (relative values)
    @Column({ type: "double precision", default: 0, name: "co2_emission" })
    co2Emission!: number;

    @Column({ type: "double precision", default: 0, name: "methane_emission" })
    methaneEmission!: number;

    @Column({ type: "double precision", default: 0, name: "nitrous_oxide" })
    nitrousOxide!: number;

    @Column({ type: "double precision", default: 0, name: "particulate_matter" })
    particulateMatter!: number;

    @Column({ type: "double precision", default: 0, name: "sulfur_dioxide" })
    sulfurDioxide!: number;

    @Column({ type: "double precision", default: 0, name: "nitrogen_dioxide" })
    nitrogenDioxide!: number;

    @Column({ type: "double precision", default: 0, name: "carbon_monoxide" })
    carbonMonoxide!: number;

    @Column({ type: "double precision", default: 0, name: "volatile_organic" })
    volatileOrganic!: number;

    @Column({ type: "double precision", default: 0 })
    ammonia!: number;

    @Column({ type: "double precision", default: 0, name: "lead_emission" })
    leadEmission!: number;

    @Column({ type: "double precision", default: 0, name: "mercury_emission" })
    mercuryEmission!: number;

    @Column({ type: "double precision", default: 0, name: "cadmium_emission" })
    cadmiumEmission!: number;

    @Column({ type: "double precision", default: 0, name: "benzene_emission" })
    benzeneEmission!: number;

    @Column({ type: "double precision", default: 0, name: "ozone_depletion" })
    ozoneDepletion!: number;

    @Column({ type: "double precision", default: 0, name: "radioactive_waste" })
    radioactiveWaste!: number;

    // Aggregated impact categories
    @Column({ type: "double precision", default: 0, name: "air_pollution" })
    airPollution!: number;

    @Column({ type: "double precision", default: 0, name: "water_pollution" })
    waterPollution!: number;

    @Column({ type: "double precision", default: 0, name: "soil_pollution" })
    soilPollution!: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt!: Date;
}
