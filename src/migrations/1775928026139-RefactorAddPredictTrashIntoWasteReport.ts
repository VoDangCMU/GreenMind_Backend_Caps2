import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorAddPredictTrashIntoWasteReport1775928026139 implements MigrationInterface {
    name = 'RefactorAddPredictTrashIntoWasteReport1775928026139'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "segmentedImageUrl" text`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "segmentPercent" double precision`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "segmentPercent"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "segmentedImageUrl"`);
    }

}
