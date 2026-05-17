import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { QueryFailedError } from "typeorm";
import { AppError } from "../utils/AppError";

// PostgreSQL error codes
const PG_UNIQUE_VIOLATION    = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_NOT_NULL_VIOLATION  = "23502";
const PG_CHECK_VIOLATION     = "23514";

/**
 * Global error-handling middleware — must be the LAST middleware registered.
 *
 * Priority:
 *  1. AppError (intentional, operational) → forward statusCode + message
 *  2. ZodError (validation)               → 400 with readable field errors
 *  3. QueryFailedError (TypeORM/Postgres)  → 4xx with a safe, specific message
 *  4. Anything else                        → log + 500 "Internal server error"
 */
export function errorMiddleware(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // ── 1. Known operational errors ─────────────────────────────────────────
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
    }

    // ── 2. Zod validation errors ─────────────────────────────────────────────
    if (err instanceof ZodError) {
        const issues = err.issues
            .map((i) => {
                const field = i.path.join(".") || "value";
                return `${field}: ${i.message}`;
            })
            .join("; ");
        res.status(400).json({ message: `Validation failed — ${issues}` });
        return;
    }

    // ── 3. TypeORM / PostgreSQL errors ───────────────────────────────────────
    if (err instanceof QueryFailedError) {
        const code = (err as QueryFailedError & { code?: string }).code;

        const pgMessages: Record<string, { status: number; message: string }> = {
            [PG_UNIQUE_VIOLATION]:     { status: 409, message: "Duplicate entry: this resource already exists" },
            [PG_FOREIGN_KEY_VIOLATION]:{ status: 400, message: "Referenced resource does not exist" },
            [PG_NOT_NULL_VIOLATION]:   { status: 400, message: "A required field is missing" },
            [PG_CHECK_VIOLATION]:      { status: 400, message: "Value violates a database constraint" },
        };

        const mapped = code ? pgMessages[code] : undefined;
        if (mapped) {
            res.status(mapped.status).json({ message: mapped.message });
            return;
        }

        // Unknown DB error — log details, return safe generic
        console.error("[DatabaseError]", err.message, err.query);
        res.status(500).json({ message: "Database operation failed" });
        return;
    }

    // ── 4. Truly unexpected errors ───────────────────────────────────────────
    console.error("[UnhandledError]", err);
    res.status(500).json({ message: "Internal server error" });
}
