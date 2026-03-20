import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageKeyToWasteReport1774100000000 implements MigrationInterface {
    name = 'AddImageKeyToWasteReport1774100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "imageKey" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "imageKey"`);
    }
}
