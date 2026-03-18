import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcrypt";
import AppDataSource from "../infrastructure/database";
import { User } from "../entity/user";

import { Locations } from "../entity/locations";
import { JWTHelper } from "../utils/jwtHelper";
import { GoogleLoginHelper } from "../utils/googleLoginHelper";
import { BitmapHelper } from "../utils/bitmapHelper";
import { UsernameHelper } from "../utils/usernameHelper";
import { BigFive, BigFiveType } from "../entity/big_five";

class UserController {
    public RegisterWithEmail: RequestHandler = async (req: Request, res: Response) => {
        const startTime = Date.now();
        const { email, password, confirm_password, full_name, date_of_birth, location, gender, region } = req.body;


        if (!email || !password || !full_name || !date_of_birth || !location || !gender) {
            res.status(400).json({
                message: "Email, password, full name, date of birth, gender and location are required"
            });
            return;
        }

        try {
            const userRepository = AppDataSource.getRepository(User);

            // Check if user already exists
            const existingUser = await userRepository.findOne({
                where: { email }
            });

            if (existingUser) {
                res.status(400).json({ message: "Email already exists" });
                return;
            }

            const username = await UsernameHelper.generateUniqueUsername(full_name);

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Parse date of birth
            const parsedDateOfBirth = new Date(date_of_birth);
            if (isNaN(parsedDateOfBirth.getTime())) {
                res.status(400).json({ message: "Invalid date of birth format" });
                return;
            }

            if (gender.toLowerCase() !== 'male' && gender.toLowerCase() !== 'female') {
                return res.status(400).json({ message: "Gender must be either 'male' or 'female'" });
            }
            const newUser = userRepository.create({
                email,
                password: hashedPassword,
                fullName: full_name,
                username,
                dateOfBirth: parsedDateOfBirth,
                location: location,
                region: region,
                gender: gender.toLowerCase(),
                role: 'user'
            });

            const savedUser = await userRepository.save(newUser);

            // Create BigFive record for user with default values
            const bigFiveRepository = AppDataSource.getRepository(BigFive);
            let existingBigFive = await bigFiveRepository.findOne({
                where: { referenceId: savedUser.id, type: BigFiveType.USER }
            });

            if (existingBigFive) {
                existingBigFive.openness = 0.5;
                existingBigFive.conscientiousness = 0.5;
                existingBigFive.extraversion = 0.5;
                existingBigFive.agreeableness = 0.5;
                existingBigFive.neuroticism = 0.5;
                await bigFiveRepository.save(existingBigFive);
            } else {
                const newBigFive = bigFiveRepository.create({
                    openness: 0.5,
                    conscientiousness: 0.5,
                    extraversion: 0.5,
                    agreeableness: 0.5,
                    neuroticism: 0.5,
                    type: BigFiveType.USER,
                    referenceId: savedUser.id
                });
                await bigFiveRepository.save(newBigFive);
            }

            const payload = {
                userId: savedUser.id,
                role: savedUser.role
            };

            const tokenPair = JWTHelper.createTokenPair(payload);

            res.cookie('access_token', tokenPair.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 // 1 day
            });
            res.cookie('refresh_token', tokenPair.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
            });

            const duration = Date.now() - startTime;

            res.status(200).json({
                message: "Register successful",
                user: {
                    id: savedUser.id,
                    username: savedUser.username,
                    email: savedUser.email,
                    fullName: savedUser.fullName,
                    dateOfBirth: savedUser.dateOfBirth,
                    location: savedUser.location,
                    region: savedUser.region,
                    gender: savedUser.gender,
                    role: savedUser.role
                },
                access_token: tokenPair.accessToken,
                refresh_token: tokenPair.refreshToken
            });
            return;
        } catch (error) {
            const duration = Date.now() - startTime;
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public LoginWithEmail: RequestHandler = async (req: Request, res: Response) => {
        const startTime = Date.now();
        const { email, password } = req.body;


        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { email },
                select: ['id', 'email', 'username', 'password', 'role', 'fullName', 'location', 'dateOfBirth']
            });

            const duration = Date.now() - startTime;

            // ✅ Check user existence and password presence first
            if (!user || !user.password) {
                return res.status(400).json({ message: "Invalid email or password" });
            }

            // ✅ Compare password safely
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Invalid email or password" });
            }

            // Calculate age from dateOfBirth
            let age = null;
            if (user.dateOfBirth) {
                const today = new Date();
                const birthDate = new Date(user.dateOfBirth);
                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }

            const payload = {
                userId: user.id,
                role: user.role
            };

            const tokenPair = JWTHelper.createTokenPair(payload);

            res.cookie('access_token', tokenPair.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24
            });
            res.cookie('refresh_token', tokenPair.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 7
            });


            return res.status(200).json({
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    location: user.location,
                    age: age
                },
                access_token: tokenPair.accessToken,
                refresh_token: tokenPair.refreshToken
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            return res.status(500).json({ message: "Internal server error" });
        }
    };

    public LoginWithGoogle: RequestHandler = async (req: Request, res: Response) => {
        const startTime = Date.now();
        const { token, device_id } = req.body;


        if (!token) {
            res.status(400).json({ message: "Google token is required" });
            return;
        }

        try {
            const result = await GoogleLoginHelper.handleGoogleLogin(token, device_id);
            const duration = Date.now() - startTime;

            // Set tokens in cookies
            res.cookie('access_token', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 // 1 day
            });
            res.cookie('refresh_token', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
            });


            res.status(200).json({
                message: "Google login successful",
                user: result.user,
                access_token: result.accessToken,
                refresh_token: result.refreshToken
            });
            return;

        } catch (error) {
            const duration = Date.now() - startTime;

            if ((error as Error).message.includes('verify Google token')) {
                res.status(401).json({ message: "Invalid Google token" });
            } else if ((error as Error).message.includes('process user data')) {
                res.status(500).json({ message: "Failed to process user data" });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
            return;
        }
    }

    public GetProfile: RequestHandler = async (req: Request, res: Response) => {
        const startTime = Date.now();

        if (!req.user || !req.user.userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { id: req.user.userId }
            });

            const duration = Date.now() - startTime;

            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            // Calculate age from dateOfBirth
            let age = null;
            if (user.dateOfBirth) {
                const today = new Date();
                const birthDate = new Date(user.dateOfBirth);
                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }


            res.status(200).json({
                id: user.id,
                username: user.username,
                email: user.email,
                phone_number: user.phoneNumber,
                full_name: user.fullName,
                gender: user.gender,
                role: user.role,
                date_of_birth: user.dateOfBirth,
                age: age,
                location: user.location,
                created_at: user.createdAt,
                updated_at: user.updatedAt
            });
            return;

        } catch (error) {
            const duration = Date.now() - startTime;
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public Logout: RequestHandler = async (req: Request, res: Response) => {
        const startTime = Date.now();

        if (!req.user || !req.user.userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        try {
            // Lấy token từ cookie hoặc header
            let token = req.cookies?.access_token;
            if (!token) {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith("Bearer ")) {
                    token = authHeader.split(" ")[1];
                }
            }

            if (token) {
                // Blacklist token in Redis with 7 day TTL
                await BitmapHelper.blacklistToken(token, 7 * 24 * 60 * 60 * 1000);

            }

            // Clear cookies
            res.clearCookie('access_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            const duration = Date.now() - startTime;

            res.status(200).json({ message: "Logout successful" });
            return;

        } catch (error) {
            const duration = Date.now() - startTime;
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public GetAllUsers: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const bigFiveRepository = AppDataSource.getRepository(BigFive);

            const users = await userRepository.find();

            // Manually fetch BigFive for each user using referenceId and type
            const usersWithBigFive = await Promise.all(
                users.map(async (user) => {
                    const bigFive = await bigFiveRepository.findOne({
                        where: {
                            referenceId: user.id,
                            type: BigFiveType.USER
                        }
                    });
                    return {
                        ...user,
                        bigFive
                    };
                })
            );

            return res.status(200).json({
                message: "Get all users successfully",
                data: usersWithBigFive
            });
        } catch (e: any) {
            return res.status(500).json({ message: "Internal server error", error: e.message });
        }
    }

    public DeleteUserById: RequestHandler = async (req: Request, res: Response) => {
        const startTime = Date.now();
        const userIdToDelete = req.params.id;

        if (!req.user || !req.user.userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!userIdToDelete) {
            res.status(400).json({ message: "User id is required" });
            return;
        }

        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id: userIdToDelete } });

            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            await userRepository.delete({ id: userIdToDelete });

            const duration = Date.now() - startTime;

            res.status(200).json({ success: true, message: "User deleted" });
            return;
        } catch (error) {
            const duration = Date.now() - startTime;
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }
}

export default new UserController();