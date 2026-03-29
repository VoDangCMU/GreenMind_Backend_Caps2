import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageFieldsToInvoice1774756082431 implements MigrationInterface {
    name = 'AddImageFieldsToInvoice1774756082431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "imageKey" text`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "imageUrl" text`);
        await queryRunner.query(`UPDATE "waste_reports" SET "imageEvidenceUrl" = '' WHERE "imageEvidenceUrl" IS NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_079b6673b88101596abc9ef0fce" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_079b6673b88101596abc9ef0fce"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "imageUrl"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "imageKey"`);
    }

}
