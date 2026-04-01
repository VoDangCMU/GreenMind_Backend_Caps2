import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyHousehold1775058133141 implements MigrationInterface {
    name = 'ModifyHousehold1775058133141'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."waste_detection_detecttype_enum" AS ENUM('detect_trash', 'predict_pollutant_impact')`);
        await queryRunner.query(`CREATE TABLE "waste_detection" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "imageUrl" text, "items" jsonb, "pollution" jsonb, "impact" jsonb, "totalObjects" integer, "aiAnalysis" text, "householdId" uuid, "detectType" "public"."waste_detection_detecttype_enum", "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_ecd9b36c98cb9da63413805f07d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD CONSTRAINT "FK_afbfe5a15968b7f343b30d1a2c1" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD CONSTRAINT "FK_2a24754b7c821eebc63899b0eba" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP CONSTRAINT "FK_2a24754b7c821eebc63899b0eba"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP CONSTRAINT "FK_afbfe5a15968b7f343b30d1a2c1"`);
        await queryRunner.query(`DROP TABLE "waste_detection"`);
        await queryRunner.query(`DROP TYPE "public"."waste_detection_detecttype_enum"`);
    }

}
