import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWasteModule1773853186472 implements MigrationInterface {
    name = 'CreateWasteModule1773853186472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "urban_areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "city" character varying(255) NOT NULL, "lat" numeric(10,7), "lng" numeric(10,7), CONSTRAINT "PK_df27dee7d3448d83eaa86c82444" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "households" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" text NOT NULL, "urbanAreaId" uuid, "lat" numeric(10,7), "lng" numeric(10,7), CONSTRAINT "PK_2b1aef2640717132e9231aac756" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "waste_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "householdId" uuid NOT NULL, "description" text, "imageUrl" text, "lat" numeric(10,7), "lng" numeric(10,7), "status" character varying(50) NOT NULL DEFAULT 'PENDING', "assignedCollectorId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ede43ef14e392cbaffa3dd0a4aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "waste_collections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "collectorId" uuid NOT NULL, "householdId" uuid, "status" character varying(50) NOT NULL DEFAULT 'PENDING', "collectedAt" TIMESTAMP, "lat" numeric(10,7), "lng" numeric(10,7), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1af0279dfb7278147081049b8d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "householdId" uuid, "activityType" character varying(50) NOT NULL, "metadata" jsonb, "mediaUrl" text, "location" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "householdId" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_a993c6b2f3b88a5deb8c7ea7684" FOREIGN KEY ("urbanAreaId") REFERENCES "urban_areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_9f2bf0d078e4181553a2f7b56c1" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_a9f43c0e1c8454de3b43adce117" FOREIGN KEY ("assignedCollectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_collections" ADD CONSTRAINT "FK_b2768d3d4ae692b9d2f4ecce171" FOREIGN KEY ("collectorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_collections" ADD CONSTRAINT "FK_099bbd2b1528ea6c8ee7eec6e5e" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_5a2cfe6f705df945b20c1b22c71" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_9e9f4246d87eb6da909fd42d902" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_9e9f4246d87eb6da909fd42d902"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_5a2cfe6f705df945b20c1b22c71"`);
        await queryRunner.query(`ALTER TABLE "waste_collections" DROP CONSTRAINT "FK_099bbd2b1528ea6c8ee7eec6e5e"`);
        await queryRunner.query(`ALTER TABLE "waste_collections" DROP CONSTRAINT "FK_b2768d3d4ae692b9d2f4ecce171"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_a9f43c0e1c8454de3b43adce117"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_9f2bf0d078e4181553a2f7b56c1"`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_a993c6b2f3b88a5deb8c7ea7684"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "householdId"`);
        await queryRunner.query(`DROP TABLE "activities"`);
        await queryRunner.query(`DROP TABLE "waste_collections"`);
        await queryRunner.query(`DROP TABLE "waste_reports"`);
        await queryRunner.query(`DROP TABLE "households"`);
        await queryRunner.query(`DROP TABLE "urban_areas"`);
    }

}
