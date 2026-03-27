import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReportedByUserIdToWasteReport1774623432000 implements MigrationInterface {
    name = 'AddReportedByUserIdToWasteReport1774623432000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "reportedByUserId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_waste_reports_reportedByUserId" ON "waste_reports" ("reportedByUserId")`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_waste_reports_reportedByUserId" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_waste_reports_reportedByUserId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_waste_reports_reportedByUserId"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "reportedByUserId"`);
    }

}
