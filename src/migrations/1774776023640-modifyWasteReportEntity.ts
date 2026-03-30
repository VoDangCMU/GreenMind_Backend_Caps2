import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyWasteReportEntity1774776023640 implements MigrationInterface {
    name = 'ModifyWasteReportEntity1774776023640'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wasteType"`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_wastetype_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "imageKey"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "UQ_28ed3a3a3a76612e4ec563a5959"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "items" jsonb`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "pollution" jsonb`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "impact" jsonb`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "totalObjects" integer`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "aiAnalysis" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "aiAnalysis"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "totalObjects"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "impact"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "pollution"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "items"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "UQ_28ed3a3a3a76612e4ec563a5959" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "imageKey" text`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_wastetype_enum" AS ENUM('plastic', 'organic', 'mixed', 'hazardous')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wasteType" "public"."waste_reports_wastetype_enum" NOT NULL`);
    }

}
