import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSegments1778165793090 implements MigrationInterface {
    name = 'AddSegments1778165793090'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "segments" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "segments"`);
    }

}
