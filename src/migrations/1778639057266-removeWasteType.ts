import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveWasteType1778639057266 implements MigrationInterface {
    name = 'RemoveWasteType1778639057266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wasteType"`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_wastetype_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_wastetype_enum" AS ENUM('plastic', 'organic', 'mixed', 'hazardous')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wasteType" "public"."waste_reports_wastetype_enum" NOT NULL`);
    }

}