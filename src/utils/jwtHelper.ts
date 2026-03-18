import jwt from "jsonwebtoken";
import { config } from '../config/env';

export interface JWTPayload {
    userId: string;
    role?: string;
    email?: string; // Làm email optional thay vì required
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export class JWTHelper {

    public static createAccessToken(payload: JWTPayload): string {
        const options: jwt.SignOptions = {
            algorithm: config.jwt.algorithm as jwt.Algorithm,
            expiresIn: (config.jwt.expire || '1h') as jwt.SignOptions['expiresIn'],
        };

        return jwt.sign(payload, config.jwt.secretKey, options);
    }

    public static createRefreshToken(payload: JWTPayload): string {
        const options: jwt.SignOptions = {
            algorithm: config.jwt.algorithm as jwt.Algorithm,
            expiresIn: (config.jwt.expire || '1h') as jwt.SignOptions['expiresIn'],
        };

        return jwt.sign(payload, config.jwt.secretKey || config.jwt.secretKey, options);
    }

    public static createTokenPair(payload: JWTPayload): TokenPair {
        return {
            accessToken: this.createAccessToken(payload),
            refreshToken: this.createRefreshToken(payload)
        };
    }

    public static verifyAccessToken(token: string): JWTPayload {
        return jwt.verify(token, config.jwt.secretKey) as JWTPayload;
    }

    public static verifyRefreshToken(token: string): JWTPayload {
        return jwt.verify(token, config.jwt.secretKey || config.jwt.secretKey) as JWTPayload;
    }
}

export default new JWTHelper();