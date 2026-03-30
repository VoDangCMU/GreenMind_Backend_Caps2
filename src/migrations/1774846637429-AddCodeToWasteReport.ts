import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeToWasteReport1774846637429 implements MigrationInterface {
    name = 'AddCodeToWasteReport1774846637429'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "code" character varying`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "UQ_waste_reports_code" UNIQUE ("code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "UQ_waste_reports_code"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "code"`);
    }

}
