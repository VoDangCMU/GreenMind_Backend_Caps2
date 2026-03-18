import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";
import { SurveyScenario } from "./survey_scenario";
import { User } from "./user";
const SIMULATED_SURVEY_TABLE_NAME = "simulated_survey_scenarios";

@Entity(SIMULATED_SURVEY_TABLE_NAME)
export class SimulatedSurvey {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @OneToOne(() => SurveyScenario, (scenario) => scenario.simulatedSurvey, {
        onDelete: "CASCADE",
    })
    @JoinColumn()
    scenario!: SurveyScenario;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn()
    triggeredBy!: User; 

    @Column({ type: "int" })
    totalEligible!: number;

    @Column({ type: "int" })
    targetCount!: number;

    @Column({ type: "int", default: 0 })
    assignedCount!: number;

    @Column({ type: "int", default: 0 })
    unassignedCount!: number;

    @Column({ type: "varchar", length: 50, default: "completed" })
    status!: string;

    @Column({ type: "text", nullable: true })
    notes!: string;

    @Column({ type: "json", nullable: true })
    eligibleUsers!: {
        userId: string;
        username: string;
        fullName: string;
        age: number | null;
        gender: string | null;
        location: string | string[] | null;
        status: "assigned" | "not_assigned";
    }[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}