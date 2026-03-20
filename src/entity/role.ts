import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany
} from 'typeorm';
import { User } from './user';

// Role ID Constants
export const ROLE_ID = {
    HOUSEHOLD: 1,
    WASTE_COLLECTOR: 2,
    VOLUNTEER: 3,
    EXPERT: 4,
    ADMIN: 5,
} as const;

export type RoleId = typeof ROLE_ID[keyof typeof ROLE_ID];

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    name!: string;

    @OneToMany(() => User, user => user.roleRef)
    users!: User[];
}
