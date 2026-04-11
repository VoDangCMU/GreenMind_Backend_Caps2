import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorAiFieldsWasteReport1775990000000 implements MigrationInterface {
    name = 'RefactorAiFieldsWasteReport1775990000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "segmentPercent"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "depthImageUrl" text`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "heatmapUrl" text`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "segmentRatio" double precision`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "pollutionScore" double precision`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "pollutionLevel" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "pollutionLevel"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "pollutionScore"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "segmentRatio"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "heatmapUrl"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "depthImageUrl"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "segmentPercent" double precision`);
    }
}
