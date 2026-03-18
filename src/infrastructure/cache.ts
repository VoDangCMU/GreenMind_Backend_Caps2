import Redis from "ioredis";
import { config } from "../config/env";

export const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
});
