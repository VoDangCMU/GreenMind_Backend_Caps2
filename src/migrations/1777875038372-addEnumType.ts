import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnumType1777875038372 implements MigrationInterface {
    name = 'AddEnumType1777875038372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_blog"`);
        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_user"`);
        await queryRunner.query(`ALTER TYPE "public"."waste_detection_detecttype_enum" RENAME TO "waste_detection_detecttype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_detection_detecttype_enum" AS ENUM('detect_trash', 'predict_pollutant_impact', 'total_mass', 'analyze_all')`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ALTER COLUMN "detectType" TYPE "public"."waste_detection_detecttype_enum" USING "detectType"::"text"::"public"."waste_detection_detecttype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."waste_detection_detecttype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_166954a3340789682daf335b3f4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_c5841a0dd900a8e78146810d909" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_c5841a0dd900a8e78146810d909"`);
        await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_166954a3340789682daf335b3f4"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_detection_detecttype_enum_old" AS ENUM('detect_trash', 'predict_pollutant_impact', 'total_mass')`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ALTER COLUMN "detectType" TYPE "public"."waste_detection_detecttype_enum_old" USING "detectType"::"text"::"public"."waste_detection_detecttype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."waste_detection_detecttype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."waste_detection_detecttype_enum_old" RENAME TO "waste_detection_detecttype_enum"`);
        await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_blog" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
