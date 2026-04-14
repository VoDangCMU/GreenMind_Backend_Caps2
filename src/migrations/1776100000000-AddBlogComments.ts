import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlogComments1776100000000 implements MigrationInterface {
    name = 'AddBlogComments1776100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blogs" ADD "comment_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE TABLE "blog_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "userId" uuid NOT NULL, "blogId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_blog" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_blog"`);
        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_user"`);
        await queryRunner.query(`DROP TABLE "blog_comments"`);
        await queryRunner.query(`ALTER TABLE "blogs" DROP COLUMN "comment_count"`);
    }

}
