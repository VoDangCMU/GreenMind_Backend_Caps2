import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCollectorFromWasteReport1776000000000 implements MigrationInterface {
    name = 'RemoveCollectorFromWasteReport1776000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN IF EXISTS "assignedCollectorId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD COLUMN IF NOT EXISTS "assignedCollectorId" uuid`);
    }
}
