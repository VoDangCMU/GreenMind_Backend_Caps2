import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    app: z.object({
        port: z.coerce.number().default(3000),
        env: z.enum(["development", "production", "staging","test"]).default("development"),
        host: z.string().default("localhost"),
    }),

    db: z.object({
        host: z.string(),
        port: z.coerce.number().default(5432),
        username: z.string(),
        password: z.string(),
        name: z.string(),
        url: z.string().optional(),
    }),

    redis: z.object({
        host: z.string(),
        port: z.coerce.number().default(6379),
        password: z.string().optional(),
        db: z.coerce.number().default(0),
    }),

    jwt: z.object({
        algorithm: z.string().default("HS256"),
        expire: z.string().default("1h"),
        secretKey: z.string(),
    }),

    security: z.object({
        allowedDomains: z.string().optional(),
        globalDomain: z.string().optional(),
    }),
});

const parsed = envSchema.safeParse({
    app: {
        port: process.env.PORT,
        env: process.env.DEPLOY_ENV,
        host: process.env.HOST || "localhost",
    },
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
        url: process.env.DB_URL,
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB,
    },
    jwt: {
        algorithm: process.env.JWT_ALGORITHM,
        expire: process.env.JWT_EXPIRE,
        secretKey: process.env.JWT_SECRET_KEY,
    },
    security: {
        allowedDomains: process.env.ALLOWED_DOMAINS,
        globalDomain: process.env.GLOBAL_DOMAIN,
    },
});

if (!parsed.success) {
    console.error("Environment variable validation error:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = parsed.data;