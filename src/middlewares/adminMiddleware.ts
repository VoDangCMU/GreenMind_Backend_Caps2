import { Request, Response, NextFunction } from "express";

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated (should be set by jwtAuthMiddleware)
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: "Access denied. Admin privileges required."
        });
    }

    next();
};

export const staffOrAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated (should be set by jwtAuthMiddleware)
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user has staff or admin role
    if (req.user.role !== 'admin' && req.user.role !== 'expert') {
        return res.status(403).json({
            message: "Access denied. Staff or admin privileges required."
        });
    }

    next();
};