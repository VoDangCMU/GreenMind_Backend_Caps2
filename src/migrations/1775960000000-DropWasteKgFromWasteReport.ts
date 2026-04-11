import { MigrationInterface, QueryRunner } from "typeorm";

export class DropWasteKgFromWasteReport1775960000000 implements MigrationInterface {
    name = 'DropWasteKgFromWasteReport1775960000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "wasteKg"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "wasteKg" double precision`);
    }
}
