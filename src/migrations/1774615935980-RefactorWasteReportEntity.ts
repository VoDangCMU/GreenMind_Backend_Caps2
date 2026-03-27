import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorWasteReportEntity1774615935980 implements MigrationInterface {
    name = 'RefactorWasteReportEntity1774615935980'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_23c0f594d4c887fe074dd76e82f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23c0f594d4c887fe074dd76e82"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_302cf239ce37c5ed96872957ab"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "householdId"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wardId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wards"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wardName" character varying(100)`);
        await queryRunner.query(`UPDATE "waste_reports" SET "wardName" = 'Unknown' WHERE "wardName" IS NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "wardName" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_a5438c300df835f63cb59c0889" ON "waste_reports" ("wardName") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa98f497a62f2204bbaa0e4908" ON "waste_reports" ("wardName", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fa98f497a62f2204bbaa0e4908"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5438c300df835f63cb59c0889"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wardName"`);
        await queryRunner.query(`CREATE TABLE "wards" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_wards" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wardId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "householdId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_302cf239ce37c5ed96872957ab" ON "waste_reports" ("status", "wardId") `);
        await queryRunner.query(`CREATE INDEX "IDX_23c0f594d4c887fe074dd76e82" ON "waste_reports" ("wardId") `);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_23c0f594d4c887fe074dd76e82f" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
