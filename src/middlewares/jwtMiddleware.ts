import { Request, Response, NextFunction } from "express";
import { JWTHelper } from "../utils/jwtHelper";
import { BitmapHelper } from "../utils/bitmapHelper";


declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role?: string;
            };
        }
    }
}

export const jwtAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    let token = req.cookies?.access_token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing or invalid access token" });
        }
        token = authHeader.split(" ")[1];
    }

    try {
        const payload = JWTHelper.verifyAccessToken(token);

        if (!payload) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const isBlacklisted = await BitmapHelper.isTokenBlacklisted(token);

        if (isBlacklisted) {
            return res.status(401).json({ message: "Token has been revoked" });
        }

        req.user = {
            userId: payload.userId,
            role: payload.role
        };

        next();
    } catch (error) {
        console.error("Error in JWT middleware:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export const revokeTokenMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        try {
            await BitmapHelper.blacklistToken(token, 7 * 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error("Error revoking token:", error);
        }
    }

    next();
};