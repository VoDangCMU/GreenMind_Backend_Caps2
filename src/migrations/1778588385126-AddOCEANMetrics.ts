import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOCEANMetrics1778588385126 implements MigrationInterface {
    name = 'AddOCEANMetrics1778588385126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ocean_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" character varying(100) NOT NULL, "data" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_691896d71487733c5fdbdab02b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_ocean_metrics_user_type" ON "ocean_metrics" ("userId", "type") `);
        await queryRunner.query(`ALTER TABLE "ocean_metrics" ADD CONSTRAINT "FK_e5bd9ca5f8d119961be43994f46" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ocean_metrics" DROP CONSTRAINT "FK_e5bd9ca5f8d119961be43994f46"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ocean_metrics_user_type"`);
        await queryRunner.query(`DROP TABLE "ocean_metrics"`);
    }

}
