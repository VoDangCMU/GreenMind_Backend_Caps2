import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAPIgreenScore1779013573556 implements MigrationInterface {
    name = 'FixAPIgreenScore1779013573556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "green_score" ADD "wasteDetectionId" uuid`);
        await queryRunner.query(`ALTER TABLE "green_score" ADD CONSTRAINT "UQ_eb1f3a9748b7fb62be26c19dc26" UNIQUE ("wasteDetectionId")`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "greenScoreId" uuid`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ALTER COLUMN "isPaid" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "green_score" ADD CONSTRAINT "FK_eb1f3a9748b7fb62be26c19dc26" FOREIGN KEY ("wasteDetectionId") REFERENCES "waste_detection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "green_score" DROP CONSTRAINT "FK_eb1f3a9748b7fb62be26c19dc26"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ALTER COLUMN "isPaid" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "greenScoreId"`);
        await queryRunner.query(`ALTER TABLE "green_score" DROP CONSTRAINT "UQ_eb1f3a9748b7fb62be26c19dc26"`);
        await queryRunner.query(`ALTER TABLE "green_score" DROP COLUMN "wasteDetectionId"`);
    }

}
