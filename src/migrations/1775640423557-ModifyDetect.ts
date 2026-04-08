import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyDetect1775640423557 implements MigrationInterface {
    name = 'ModifyDetect1775640423557'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "waste_detection" DROP COLUMN "itemsMass"`);
        await queryRunner.query(`ALTER TYPE "public"."waste_detection_detecttype_enum" RENAME TO "waste_detection_detecttype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."waste_detection_detecttype_enum" AS ENUM('detect_trash', 'predict_pollutant_impact', 'total_mass')`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ALTER COLUMN "detectType" TYPE "public"."waste_detection_detecttype_enum" USING "detectType"::"text"::"public"."waste_detection_detecttype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."waste_detection_detecttype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."waste_detection_detecttype_enum_old" AS ENUM('detect_trash', 'predict_pollutant_impact')`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ALTER COLUMN "detectType" TYPE "public"."waste_detection_detecttype_enum_old" USING "detectType"::"text"::"public"."waste_detection_detecttype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."waste_detection_detecttype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."waste_detection_detecttype_enum_old" RENAME TO "waste_detection_detecttype_enum"`);
        await queryRunner.query(`ALTER TABLE "waste_detection" ADD "itemsMass" jsonb`);
    }

}
