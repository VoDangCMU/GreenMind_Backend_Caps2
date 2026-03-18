import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from 'typeorm';
import { User } from './user';

@Entity('todos')
export class Todo {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 500 })
    title!: string;

    @Column({ type: 'boolean', default: false })
    completed!: boolean;

    @Column({ type: 'uuid', nullable: true })
    parent_id!: string | null;

    @ManyToOne(() => Todo, todo => todo.subtasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_id' })
    parent!: Todo | null;

    @OneToMany(() => Todo, todo => todo.parent)
    subtasks!: Todo[];

    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'int', default: 0 })
    order!: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}