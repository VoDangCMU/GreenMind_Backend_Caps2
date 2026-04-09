import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMassToDetectEntity1775584621849 implements MigrationInterface {
    name = 'AddMassToDetectEntity1775584621849'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "environmental_impact" DROP CONSTRAINT "FK_env_impact_user"`);
        await queryRunner.query(`ALTER TABLE "households" ADD "scoreGreen" double precision DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "totalMassKg" double precision`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "annotatedImageUrl" text`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "depthMapUrl" text`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "itemsMass" jsonb`);
        await queryRunner.query(`ALTER TABLE "environmental_impact" ADD CONSTRAINT "FK_306ede85c00878b7f796dc095e2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "environmental_impact" DROP CONSTRAINT "FK_306ede85c00878b7f796dc095e2"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "itemsMass"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "depthMapUrl"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "annotatedImageUrl"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "totalMassKg"`);
        await queryRunner.query(`ALTER TABLE "households" DROP COLUMN "scoreGreen"`);
        await queryRunner.query(`ALTER TABLE "environmental_impact" ADD CONSTRAINT "FK_env_impact_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
