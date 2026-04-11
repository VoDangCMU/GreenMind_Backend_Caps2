import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGreenScore1775865413942 implements MigrationInterface {
    name = 'AddGreenScore1775865413942'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_fb1f4f4955651c1137dacd5a6c7"`);
        await queryRunner.query(`ALTER TABLE "blogs" DROP CONSTRAINT "FK_blogs_author"`);
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "FK_blog_likes_blog"`);
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "FK_blog_likes_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_blogs_author_id"`);
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "UQ_blog_likes_user_blog"`);
        await queryRunner.query(`CREATE TABLE "green_score" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "previousScore" double precision NOT NULL, "delta" double precision NOT NULL, "finalScore" double precision NOT NULL DEFAULT '50', "householdId" uuid, "items" jsonb, "reasons" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_49138ae2a7c3cf4f01f27c007f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "UQ_fb1f4f4955651c1137dacd5a6c7"`);
        await queryRunner.query(`ALTER TABLE "households" DROP COLUMN "headOfHouseholdId"`);
        await queryRunner.query(`ALTER TABLE "households" DROP COLUMN "scoreGreen"`);
        await queryRunner.query(`CREATE INDEX "IDX_a5438c300df835f63cb59c0889" ON "waste_reports" ("wardName") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab2dac6d3886bf3c1343fc1053" ON "waste_reports" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_677884935544e50ad17d7baef5" ON "waste_reports" ("assignedCollectorId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa98f497a62f2204bbaa0e4908" ON "waste_reports" ("wardName", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_b324119dcb71e877cee411f792" ON "blogs" ("author_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_562b29e40a6f7c4ebc3e4f5fea" ON "blog_likes" ("userId", "blogId") `);
        await queryRunner.query(`ALTER TABLE "green_score" ADD CONSTRAINT "FK_4cf230af6e0eeba6c24ae4bc0e1" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blogs" ADD CONSTRAINT "FK_b324119dcb71e877cee411f7929" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "FK_26aab4d17339481b1058f98b215" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "FK_7bcacc0bdda9cebe542d5664b01" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "FK_7bcacc0bdda9cebe542d5664b01"`);
        await queryRunner.query(`ALTER TABLE "blog_likes" DROP CONSTRAINT "FK_26aab4d17339481b1058f98b215"`);
        await queryRunner.query(`ALTER TABLE "blogs" DROP CONSTRAINT "FK_b324119dcb71e877cee411f7929"`);
        await queryRunner.query(`ALTER TABLE "green_score" DROP CONSTRAINT "FK_4cf230af6e0eeba6c24ae4bc0e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_562b29e40a6f7c4ebc3e4f5fea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b324119dcb71e877cee411f792"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa98f497a62f2204bbaa0e4908"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_677884935544e50ad17d7baef5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab2dac6d3886bf3c1343fc1053"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5438c300df835f63cb59c0889"`);
        await queryRunner.query(`ALTER TABLE "households" ADD "scoreGreen" double precision DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "households" ADD "headOfHouseholdId" uuid`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "UQ_fb1f4f4955651c1137dacd5a6c7" UNIQUE ("headOfHouseholdId")`);
        await queryRunner.query(`DROP TABLE "green_score"`);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "UQ_blog_likes_user_blog" UNIQUE ("userId", "blogId")`);
        await queryRunner.query(`CREATE INDEX "IDX_blogs_author_id" ON "blogs" ("author_id") `);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "FK_blog_likes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_likes" ADD CONSTRAINT "FK_blog_likes_blog" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blogs" ADD CONSTRAINT "FK_blogs_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_fb1f4f4955651c1137dacd5a6c7" FOREIGN KEY ("headOfHouseholdId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
