import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCampaignChatEntity1776328219500 implements MigrationInterface {
    name = 'AddCampaignChatEntity1776328219500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "campaign_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f87903f05267f5fd956a4b9a12e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "campaign_messages" ADD CONSTRAINT "FK_48a3218537dd02385a771d6c409" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_messages" ADD CONSTRAINT "FK_b71c971a6c15026f706156a686a" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign_messages" DROP CONSTRAINT "FK_b71c971a6c15026f706156a686a"`);
        await queryRunner.query(`ALTER TABLE "campaign_messages" DROP CONSTRAINT "FK_48a3218537dd02385a771d6c409"`);
        await queryRunner.query(`DROP TABLE "campaign_messages"`);
    }

}
