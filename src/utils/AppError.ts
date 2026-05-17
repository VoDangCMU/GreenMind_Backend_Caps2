/**
 * AppError — a known, intentional error with an HTTP status code.
 *
 * Throw this anywhere in controller/service code to signal a client-facing
 * error (4xx) or a known 5xx. The global errorMiddleware will catch it and
 * forward the statusCode + message to the response automatically.
 *
 * @example
 *   throw new AppError(404, "User not found");
 *   throw new AppError(409, "Email already exists");
 *   throw new AppError(400, "Invalid date format");
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.isOperational = true; // distinguishes expected errors from bugs
        Error.captureStackTrace(this, this.constructor);
    }
}
