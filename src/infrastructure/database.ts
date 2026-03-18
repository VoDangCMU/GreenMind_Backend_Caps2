import { config } from "../config/env";
import { DataSource } from "typeorm";

const AppDataSource = new DataSource({
    type: "postgres",
    host: config.db.host,
    port: config.db.port,
    username: config.db.username,
    password: config.db.password,
    database: config.db.name,
    entities: [__dirname + "/../entity/**/*.{ts,js}"],
    migrations: [__dirname + "/../migrations/*.{ts,js}"],
    synchronize: false,
    logging: true,
});

export default AppDataSource;