import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCollectorAPI1775980936362 implements MigrationInterface {
    name = 'AddCollectorAPI1775980936362'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."waste_detection_status_enum" AS ENUM('detected', 'brought_out', 'picked_up')`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "status" "public"."waste_detection_status_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "pickupProofImageUrl" text`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "collectorId" uuid`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "pickedUpAt" TIMESTAMP`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa98f497a62f2204bbaa0e4908"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD CONSTRAINT "FK_47cd3e29291d33ea50720f7d51e" FOREIGN KEY ("collectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP CONSTRAINT "FK_47cd3e29291d33ea50720f7d51e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa98f497a62f2204bbaa0e4908"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "pickedUpAt"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "collectorId"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "pickupProofImageUrl"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."waste_detection_status_enum"`);
    }

}
