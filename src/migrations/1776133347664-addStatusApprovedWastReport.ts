import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusApprovedWastReport1776133347664 implements MigrationInterface {
    name = 'AddStatusApprovedWastReport1776133347664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_fa98f497a62f2204bbaa0e4908"`);
        await queryRunner.query(`ALTER TYPE "public"."waste_reports_status_enum" RENAME TO "waste_reports_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_status_enum" AS ENUM('pending', 'approved', 'done')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" TYPE text USING "status"::text`);
        await queryRunner.query(`UPDATE "waste_reports" SET "status" = 'pending' WHERE "status" NOT IN ('pending', 'approved', 'done')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" TYPE "public"."waste_reports_status_enum" USING "status"::"public"."waste_reports_status_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_fa98f497a62f2204bbaa0e4908" ON "waste_reports" ("wardName", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_fa98f497a62f2204bbaa0e4908"`);
        await queryRunner.query(`ALTER TYPE "public"."waste_reports_status_enum" RENAME TO "waste_reports_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_status_enum" AS ENUM('pending', 'done')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" TYPE text USING "status"::text`);
        await queryRunner.query(`UPDATE "waste_reports" SET "status" = 'pending' WHERE "status" = 'approved'`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" TYPE "public"."waste_reports_status_enum" USING "status"::"public"."waste_reports_status_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_fa98f497a62f2204bbaa0e4908" ON "waste_reports" ("wardName", "status") `);
    }

}
