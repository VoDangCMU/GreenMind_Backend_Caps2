import { MigrationInterface, QueryRunner } from "typeorm";

export class PlantAnalysisRoutes1778592862025 implements MigrationInterface {
    name = 'PlantAnalysisRoutes1778592862025'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plant_analysis" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "vegetableArea" double precision NOT NULL, "dishArea" double precision NOT NULL, "vegetableRatioPercent" double precision NOT NULL, "plantImageUrl" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_097aa0ecd7b191338494236e74f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_plant_analysis_user" ON "plant_analysis" ("userId") `);
        await queryRunner.query(`ALTER TABLE "plant_analysis" ADD CONSTRAINT "FK_ecdfd89fbcadf4a8cc603117634" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plant_analysis" DROP CONSTRAINT "FK_ecdfd89fbcadf4a8cc603117634"`);
        await queryRunner.query(`DROP INDEX "public"."idx_plant_analysis_user"`);
        await queryRunner.query(`DROP TABLE "plant_analysis"`);
    }

}
