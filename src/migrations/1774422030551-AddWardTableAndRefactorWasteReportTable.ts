import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWardTableAndRefactorWasteReportTable1774422030551 implements MigrationInterface {
    name = 'AddWardTableAndRefactorWasteReportTable1774422030551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_roleId"`);
        await queryRunner.query(`CREATE TABLE "wards" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "district" character varying(255) NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "bounds" jsonb NOT NULL, CONSTRAINT "PK_f67afa72e02ac056570c0dde279" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "UQ_28ed3a3a3a76612e4ec563a5959" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wasteKg" double precision`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_wastetype_enum" AS ENUM('plastic', 'organic', 'mixed', 'hazardous')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wasteType" "public"."waste_reports_wastetype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "wardId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "resolvedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "roles_id_seq" OWNED BY "roles"."id"`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT nextval('"roles_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "lat"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "lat" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "lng"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "lng" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_reports_status_enum" AS ENUM('pending', 'assigned', 'done')`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "status" "public"."waste_reports_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`CREATE INDEX "IDX_23c0f594d4c887fe074dd76e82" ON "waste_reports" ("wardId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab2dac6d3886bf3c1343fc1053" ON "waste_reports" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_302cf239ce37c5ed96872957ab" ON "waste_reports" ("wardId", "status") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_23c0f594d4c887fe074dd76e82f" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_23c0f594d4c887fe074dd76e82f"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_302cf239ce37c5ed96872957ab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab2dac6d3886bf3c1343fc1053"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23c0f594d4c887fe074dd76e82"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_status_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "status" character varying(50) NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "lng"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "lng" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "lat"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "lat" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "roles_id_seq"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "resolvedAt"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wardId"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wasteType"`);
        await queryRunner.query(`DROP TYPE "public"."waste_reports_wastetype_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "wasteKg"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "UQ_28ed3a3a3a76612e4ec563a5959"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "code"`);
        await queryRunner.query(`DROP TABLE "wards"`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_roleId" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
