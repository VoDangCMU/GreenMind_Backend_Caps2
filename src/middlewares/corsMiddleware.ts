import cors from 'cors';
import {Request, Response, NextFunction} from 'express';
import {config} from '../config/env';

// CORS configuration
const corsOptions: cors.CorsOptions = {
    origin: '*', // Allow all origins for all environments
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        '*'
    ],
    credentials: false, // Set to false when using origin: '*'
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    maxAge: 86400 // Cache preflight response for 24 hours
};

// CORS middleware
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    return cors(corsOptions)(req, res, next);
};

// Simple CORS middleware for development (less restrictive)
export const devCorsMiddleware = cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true,
    optionsSuccessStatus: 200
});

export default corsMiddleware;