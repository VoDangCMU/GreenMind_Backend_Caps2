import { MigrationInterface, QueryRunner } from "typeorm";

export class DropHouseholdFkFromWasteReport1774600000000 implements MigrationInterface {
    name = 'DropHouseholdFkFromWasteReport1774600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the FK constraint from householdId → households
        await queryRunner.query(`ALTER TABLE "waste_reports" DROP CONSTRAINT IF EXISTS "FK_9f2bf0d078e4181553a2f7b56c1"`);

        // Make householdId nullable (no longer required)
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "householdId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_reports" ALTER COLUMN "householdId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "waste_reports" ADD CONSTRAINT "FK_9f2bf0d078e4181553a2f7b56c1" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
}
