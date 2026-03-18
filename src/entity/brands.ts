import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {User} from "./user";

export const BRANDS_TABLE_NAME = 'brands'

@Entity(BRANDS_TABLE_NAME)
export class Brand {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({type: "uuid"})
    userId!: string;

    @Column({type: "text", array: true})
    brands!: string[];

    @Column({type: "timestamp"})
    startDay!: Date;

    @CreateDateColumn({type: 'timestamp'})
    createdAt!: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;
}
