import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {Questions} from "./questions";

export const QUESTION_OPTIONS_TABLE_NAME = 'question_options';

@Entity(QUESTION_OPTIONS_TABLE_NAME)
export class QuestionOptions {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Questions, question => question.questionOptions, { onDelete: 'CASCADE' })
    question!: Questions;

    @Column({type: 'text'})
    text!: string;

    @Column({type: 'text'})
    value!: string;

    @Column({type: 'int', default: 0})
    order!: number; // Order of option display

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date;
}