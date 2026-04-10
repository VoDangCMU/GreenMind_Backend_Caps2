import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlogModule1775700000000 implements MigrationInterface {
    name = 'CreateBlogModule1775700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "blogs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(500) NOT NULL, "content" text NOT NULL, "tags" text, "like_count" integer NOT NULL DEFAULT '0', "author_id" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_blogs" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_blogs_author_id" ON "blogs" ("author_id")`);
        await queryRunner.query(`CREATE TABLE "blog_likes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "blogId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_blog_likes_user_blog" UNIQUE ("userId", "blogId"), CONSTRAINT "PK_blog_likes" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "blogs" ADD CONSTRAINT "FK_blogs_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "FK_blog_likes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "FK_blog_likes_blog" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "FK_blog_likes_blog"`);
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "FK_blog_likes_user"`);
        await queryRunner.query(`ALTER TABLE "blogs" DROP CONSTRAINT "FK_blogs_author"`);
        await queryRunner.query(`DROP TABLE "blog_likes"`);
        await queryRunner.query(`DROP INDEX "IDX_blogs_author_id"`);
        await queryRunner.query(`DROP TABLE "blogs"`);
    }

}
