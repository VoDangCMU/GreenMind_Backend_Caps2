import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorWasteReportEntity1774713993047 implements MigrationInterface {
    name = 'RefactorWasteReportEntity1774713993047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_collections" DROP CONSTRAINT IF EXISTS "FK_099bbd2b1528ea6c8ee7eec6e5e"`);
        await queryRunner.query(`ALTER TABLE "waste_collections" DROP CONSTRAINT IF EXISTS "FK_b2768d3d4ae692b9d2f4ecce171"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "waste_collections"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_waste_reports_reportedByUserId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_waste_reports_reportedByUserId"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "imageEvidenceUrl" text`);
        await queryRunner.query(`CREATE INDEX "IDX_677884935544e50ad17d7baef5" ON "waste_reports" ("assignedCollectorId", "status") `);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_d3472a7a8090e51040805edc28c" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_d3472a7a8090e51040805edc28c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_677884935544e50ad17d7baef5"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "imageEvidenceUrl"`);
        await queryRunner.query(`CREATE INDEX "IDX_waste_reports_reportedByUserId" ON "waste_reports" ("reportedByUserId") `);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_waste_reports_reportedByUserId" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
