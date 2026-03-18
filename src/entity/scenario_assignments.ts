import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column } from "typeorm";
import { SurveyScenario } from "./survey_scenario";
import { User } from "./user";

const SCENARIO_ASSIGNMENTS_TABLE_NAME = "scenario_assignments";
@Entity(SCENARIO_ASSIGNMENTS_TABLE_NAME)
export class ScenarioAssignment {
    @PrimaryGeneratedColumn("uuid") id!: string;

    @ManyToOne(() => SurveyScenario, (s) => s.assignments, { onDelete: "CASCADE" })
    scenario!: SurveyScenario;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    user!: User;

    @Column({ type: "varchar", default: "not_assigned" })
    status!: "assigned" | "not_assigned";

    @CreateDateColumn()
    createAt!: Date;
}