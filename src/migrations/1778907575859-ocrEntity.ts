import { MigrationInterface, QueryRunner } from "typeorm";

export class OcrEntity1778907575859 implements MigrationInterface {
    name = 'OcrEntity1778907575859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "pollution" jsonb`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "impact" jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" RENAME TO "campaign_participants_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."campaign_participants_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE "public"."campaign_participants_status_enum" USING "status"::"text"::"public"."campaign_participants_status_enum"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."campaign_participants_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."campaign_participants_status_enum_old" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'COMPLETED', 'REGISTERED')`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE "public"."campaign_participants_status_enum_old" USING "status"::"text"::"public"."campaign_participants_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."campaign_participants_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum_old" RENAME TO "campaign_participants_status_enum"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "impact"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "pollution"`);
    }

}
