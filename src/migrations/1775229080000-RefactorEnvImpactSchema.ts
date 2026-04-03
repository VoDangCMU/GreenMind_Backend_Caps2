import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorEnvImpactSchema1775229080000 implements MigrationInterface {
    name = 'RefactorEnvImpactSchema1775229080000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old table (and its FK constraint)
        await queryRunner.query(`ALTER TABLE "environmental_impact" DROP CONSTRAINT IF EXISTS "FK_306ede85c00878b7f796dc095e2"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "environmental_impact"`);

        // Create new table with updated pollutant schema
        await queryRunner.query(`
            CREATE TABLE "environmental_impact" (
                "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id"           uuid NOT NULL,
                "record_date"       date NOT NULL,
                "co2"               double precision NOT NULL DEFAULT '0',
                "dioxin"            double precision NOT NULL DEFAULT '0',
                "microplastic"      double precision NOT NULL DEFAULT '0',
                "toxic_chemicals"   double precision NOT NULL DEFAULT '0',
                "non_biodegradable" double precision NOT NULL DEFAULT '0',
                "nox"               double precision NOT NULL DEFAULT '0',
                "so2"               double precision NOT NULL DEFAULT '0',
                "ch4"               double precision NOT NULL DEFAULT '0',
                "pm25"              double precision NOT NULL DEFAULT '0',
                "pb"                double precision NOT NULL DEFAULT '0',
                "hg"                double precision NOT NULL DEFAULT '0',
                "cd"                double precision NOT NULL DEFAULT '0',
                "nitrate"           double precision NOT NULL DEFAULT '0',
                "chemical_residue"  double precision NOT NULL DEFAULT '0',
                "styrene"           double precision NOT NULL DEFAULT '0',
                "air_pollution"     double precision NOT NULL DEFAULT '0',
                "water_pollution"   double precision NOT NULL DEFAULT '0',
                "soil_pollution"    double precision NOT NULL DEFAULT '0',
                "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_env_impact" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "environmental_impact"
            ADD CONSTRAINT "FK_env_impact_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "environmental_impact" DROP CONSTRAINT IF EXISTS "FK_env_impact_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "environmental_impact"`);

        // Restore original table
        await queryRunner.query(`
            CREATE TABLE "environmental_impact" (
                "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id"           uuid NOT NULL,
                "record_date"       date NOT NULL,
                "co2_emission"      double precision NOT NULL DEFAULT '0',
                "methane_emission"  double precision NOT NULL DEFAULT '0',
                "nitrous_oxide"     double precision NOT NULL DEFAULT '0',
                "particulate_matter" double precision NOT NULL DEFAULT '0',
                "sulfur_dioxide"    double precision NOT NULL DEFAULT '0',
                "nitrogen_dioxide"  double precision NOT NULL DEFAULT '0',
                "carbon_monoxide"   double precision NOT NULL DEFAULT '0',
                "volatile_organic"  double precision NOT NULL DEFAULT '0',
                "ammonia"           double precision NOT NULL DEFAULT '0',
                "lead_emission"     double precision NOT NULL DEFAULT '0',
                "mercury_emission"  double precision NOT NULL DEFAULT '0',
                "cadmium_emission"  double precision NOT NULL DEFAULT '0',
                "benzene_emission"  double precision NOT NULL DEFAULT '0',
                "ozone_depletion"   double precision NOT NULL DEFAULT '0',
                "radioactive_waste" double precision NOT NULL DEFAULT '0',
                "air_pollution"     double precision NOT NULL DEFAULT '0',
                "water_pollution"   double precision NOT NULL DEFAULT '0',
                "soil_pollution"    double precision NOT NULL DEFAULT '0',
                "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bf431614370fa782d73cc751dd3" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "environmental_impact"
            ADD CONSTRAINT "FK_306ede85c00878b7f796dc095e2"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }
}
