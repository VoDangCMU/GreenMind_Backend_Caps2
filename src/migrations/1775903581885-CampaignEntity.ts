import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignEntity1775903581885 implements MigrationInterface {
    name = 'CampaignEntity1775903581885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."campaign_participants_status_enum" AS ENUM('REGISTERED', 'CHECKED_IN', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "campaign_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignId" uuid NOT NULL, "userId" uuid NOT NULL, "checkInTime" TIMESTAMP, "checkInLat" double precision, "checkInLng" double precision, "checkOutTime" TIMESTAMP, "checkOutLat" double precision, "checkOutLng" double precision, "status" "public"."campaign_participants_status_enum" NOT NULL DEFAULT 'REGISTERED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_347168ee0d273a3fe0bf9cc70f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."campaigns_status_enum" AS ENUM('PENDING', 'ONGOING', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "radius" double precision NOT NULL DEFAULT '500', "lat" double precision NOT NULL, "lng" double precision NOT NULL, "status" "public"."campaigns_status_enum" NOT NULL DEFAULT 'PENDING', "createdByUserId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_831e3fcd4fc45b4e4c3f57a9ee4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD "campaignId" uuid`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ADD CONSTRAINT "FK_e0d97d6323f4e20a4107c93a0ce" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" ADD CONSTRAINT "FK_8a36539f6e19776343ccd217b25" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_ddfa08ba1ecd3098601d4089384" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_e95ef5abb87154ca9b70ce15b06" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT "FK_e95ef5abb87154ca9b70ce15b06"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_ddfa08ba1ecd3098601d4089384"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" DROP CONSTRAINT "FK_8a36539f6e19776343ccd217b25"`);
        await queryRunner.query(`ALTER TABLE "campaign_participants" DROP CONSTRAINT "FK_e0d97d6323f4e20a4107c93a0ce"`);
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP COLUMN "campaignId"`);
        await queryRunner.query(`DROP TABLE "campaigns"`);
        await queryRunner.query(`DROP TYPE "public"."campaigns_status_enum"`);
        await queryRunner.query(`DROP TABLE "campaign_participants"`);
        await queryRunner.query(`DROP TYPE "public"."campaign_participants_status_enum"`);
    }

}
