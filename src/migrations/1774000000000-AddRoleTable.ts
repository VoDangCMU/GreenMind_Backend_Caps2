import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoleTable1774000000000 implements MigrationInterface {
    name = 'AddRoleTable1774000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the roles table
        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id"   integer NOT NULL,
                "name" character varying(50) NOT NULL,
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

        // Seed the constant role values
        await queryRunner.query(`
            INSERT INTO "roles" ("id", "name") VALUES
                (1, 'household'),
                (2, 'waste_collector'),
                (3, 'volunteer'),
                (4, 'expert'),
                (5, 'admin')
        `);

        // Add roleId column to users
        await queryRunner.query(`ALTER TABLE "users" ADD "roleId" integer`);

        // Add FK constraint
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_users_roleId"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_roleId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roleId"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }
}
