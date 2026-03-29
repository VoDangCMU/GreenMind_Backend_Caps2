import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorWasteReportEntity1774794140730 implements MigrationInterface {
    name = 'RefactorWasteReportEntity1774794140730'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "imageEvidenceUrl" SET NOT NULL`);
    }

}
