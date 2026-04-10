import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { User } from './user';

export const BLOGS_TABLE_NAME = 'blogs';
export const BLOG_LIKES_TABLE_NAME = 'blog_likes';

@Entity(BLOGS_TABLE_NAME)
export class Blog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 500 })
    title!: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'simple-array', nullable: true })
    tags?: string[];

    @Column({ type: 'int', default: 0 })
    like_count!: number;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    author_id?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'author_id' })
    author?: User;

    @OneToMany(() => BlogLike, (like) => like.blog)
    likes?: BlogLike[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

@Entity(BLOG_LIKES_TABLE_NAME)
@Index(['userId', 'blogId'], { unique: true })
export class BlogLike {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user?: User;

    @Column({ type: 'uuid' })
    blogId!: string;

    @ManyToOne(() => Blog, (blog) => blog.likes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blogId' })
    blog?: Blog;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
