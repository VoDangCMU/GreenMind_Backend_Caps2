import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {User} from "./user";
import {Questions} from "../entity/questions";
import {SurveyScenario} from "../entity/survey_scenario";
import {Models} from "./models";

export const QUESTION_SETS_TABLE_NAME = 'question_sets';

@Entity(QUESTION_SETS_TABLE_NAME)
export class QuestionSets {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({type: 'varchar', length: 255})
    name!: string;

    @Column({type: 'text', nullable: true})
    description?: string;

    @ManyToOne(() => User, {nullable: false})
    owner!: User;

    @Column({type: 'text'})
    ownerId!: string;

    @ManyToOne(() => Models, {nullable: true})
    @JoinColumn({name: 'model_id'})
    model?: Models;

    @JoinTable({
        name: 'question_set_questions',
    })
    @ManyToMany(() => Questions, {nullable: false, onDelete: "CASCADE"})
    items!: Questions[];

    @OneToMany(() => SurveyScenario, (scenario) => scenario.questionSet)
    scenarios!: SurveyScenario[];

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date;
}