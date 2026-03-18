import { redis } from "./cache";
import AppDataSource from "./database";
import { DataSource } from "typeorm";
import Redis from "ioredis";

export class Infrastructure {
    database: DataSource;
    cache: Redis;

    constructor(dependencies: { database: DataSource; cache: Redis }) {
        this.database = dependencies.database;
        this.cache = dependencies.cache;
    }
}

export async function initInfrastructure() {
    // Initialize the database connection
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log("Database connection initialized successfully");
    }

    return new Infrastructure({
        database: AppDataSource,
        cache: redis,
    });
}