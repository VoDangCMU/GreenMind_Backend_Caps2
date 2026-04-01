import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorWasteReportEntity21775035725871 implements MigrationInterface {
    name = 'RefactorWasteReportEntity21775035725871'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "items"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "pollution"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "impact"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "totalObjects"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "aiAnalysis"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_wastetype_enum" AS ENUM('plastic', 'organic', 'mixed', 'hazardous')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wasteType" "public"."waste_reports_wastetype_enum"`);
        await queryRunner.query(`UPDATE "waste_reports" SET "wasteType" = 'mixed' WHERE "wasteType" IS NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "wasteType" SET NOT NULL`);
        // Backfill code for existing rows that have NULL — use UUID-based unique code
        await queryRunner.query(`UPDATE "waste_reports" SET "code" = 'WR-' || UPPER(SUBSTRING(CAST(id AS varchar), 1, 8)) WHERE "code" IS NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "code" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "code" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wasteType"`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_wastetype_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "aiAnalysis" text`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "totalObjects" integer`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "impact" jsonb`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "pollution" jsonb`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "items" jsonb`);
    }

}
