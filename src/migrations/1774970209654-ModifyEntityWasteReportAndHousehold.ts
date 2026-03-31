import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyEntityWasteReportAndHousehold1774970209654 implements MigrationInterface {
    name = 'ModifyEntityWasteReportAndHousehold1774970209654'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "households" ADD "headOfHouseholdId" uuid`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "UQ_fb1f4f4955651c1137dacd5a6c7" UNIQUE ("headOfHouseholdId")`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_detecttype_enum" AS ENUM('detect_trash', 'predict_pollutant_impact')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "detectType" "public"."waste_reports_detecttype_enum"`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_fb1f4f4955651c1137dacd5a6c7" FOREIGN KEY ("headOfHouseholdId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_fb1f4f4955651c1137dacd5a6c7"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "detectType"`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_detecttype_enum"`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "UQ_fb1f4f4955651c1137dacd5a6c7"`);
        await queryRunner.query(`ALTER TABLE "households" DROP COLUMN "headOfHouseholdId"`);
    }

}
