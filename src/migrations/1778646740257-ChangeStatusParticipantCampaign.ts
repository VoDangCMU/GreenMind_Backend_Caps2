import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeStatusParticipantCampaign1778646740257 implements MigrationInterface {
    name = 'ChangeStatusParticipantCampaign1778646740257'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" ADD VALUE IF NOT EXISTS 'PENDING'`);
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" ADD VALUE IF NOT EXISTS 'APPROVED'`);
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" ADD VALUE IF NOT EXISTS 'REJECTED'`);
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" RENAME TO "campaign_participants_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."campaign_participants_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'COMPLETED', 'REGISTERED')`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE "public"."campaign_participants_status_enum" USING "status"::text::"public"."campaign_participants_status_enum"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."campaign_participants_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE VARCHAR`);
        await queryRunner.query(`UPDATE "campaign_participants" SET "status" = 'PENDING' WHERE "status" = 'REGISTERED'`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE "public"."campaign_participants_status_enum" USING "status"::text::"public"."campaign_participants_status_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" ADD VALUE 'REGISTERED'`);
        await queryRunner.query(`ALTER TYPE "public"."campaign_participants_status_enum" RENAME TO "campaign_participants_status_enum_new"`);
        await queryRunner.query(`CREATE TYPE "public"."campaign_participants_status_enum" AS ENUM('REGISTERED', 'CHECKED_IN', 'COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE VARCHAR`);
        await queryRunner.query(`UPDATE "campaign_participants" SET "status" = 'REGISTERED' WHERE "status" IN ('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" TYPE "public"."campaign_participants_status_enum" USING "status"::text::"public"."campaign_participants_status_enum"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ALTER COLUMN "status" SET DEFAULT 'REGISTERED'`);
        await queryRunner.query(`DROP TYPE "public"."campaign_participants_status_enum_new"`);
    }
}