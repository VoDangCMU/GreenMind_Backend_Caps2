import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorWardTable1774529015306 implements MigrationInterface {
    name = 'RefactorWardTable1774529015306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wards" DROP COLUMN "district"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wards" ADD "district" character varying(255) NOT NULL`);
    }

}
