import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWasteBillingFields1778700000000 implements MigrationInterface {
    name = 'AddWasteBillingFields1778700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "isPaid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "billAmount" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "paidAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "paidAt"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "billAmount"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "isPaid"`);
    }
}
