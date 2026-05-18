import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTransactionTable1779100000000 implements MigrationInterface {
    name = 'CreateTransactionTable1779100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "household_id" uuid,
                "stripe_session_id" character varying(255),
                "stripe_payment_intent_id" character varying(255),
                "amount" numeric(15,2) NOT NULL,
                "month" integer NOT NULL,
                "year" integer NOT NULL,
                "bill_name" character varying(255) NOT NULL,
                "total_mass_kg" double precision,
                "rate_per_kg" integer NOT NULL DEFAULT 500,
                "record_count" integer NOT NULL DEFAULT 0,
                "status" character varying(50) NOT NULL DEFAULT 'pending',
                "paid_at" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e6104950637344c2da88c1da866" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD CONSTRAINT "FK_transactions_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD CONSTRAINT "FK_transactions_household"
            FOREIGN KEY ("household_id") REFERENCES "household"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_household"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_user"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
    }
}
