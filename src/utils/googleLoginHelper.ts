import axios from 'axios';
import { JWTHelper } from './jwtHelper';
import AppDataSource from '../infrastructure/database';
import { User } from '../entity/user';
import { UsernameHelper } from './usernameHelper';


export interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
}

export interface LoginResult {
    user: any;
    accessToken: string;
    refreshToken: string;
}

export class GoogleLoginHelper {
    private static readonly GOOGLE_API_URL = 'https://www.googleapis.com/oauth2/v1/userinfo';

    public static async verifyGoogleToken(accessToken: string): Promise<GoogleUserInfo> {
        try {
            const response = await axios.get(this.GOOGLE_API_URL, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (response.status !== 200) {
                throw new Error('Invalid Google access token');
            }

            return response.data as GoogleUserInfo;
        } catch (error) {
            throw new Error('Failed to verify Google token');
        }
    }

    /**
     * Tạo hoặc cập nhật user từ thông tin Google
     */
    public static async createOrUpdateUser(googleUserInfo: GoogleUserInfo): Promise<User> {
        try {
            const userRepository = AppDataSource.getRepository(User);

            // Tìm user theo email
            let user = await userRepository.findOne({
                where: { email: googleUserInfo.email }
            });

            if (user) {
                // Cập nhật thông tin user nếu đã tồn tại
                user.fullName = googleUserInfo.name;
                user.updatedAt = new Date();
                user = await userRepository.save(user);
            } else {
                // Generate unique username from Google name
                const username = await UsernameHelper.generateUniqueUsername(googleUserInfo.name);

                // Tạo user mới nếu chưa tồn tại
                user = userRepository.create({
                    email: googleUserInfo.email,
                    username: username,
                    fullName: googleUserInfo.name,
                    password: '', // Google login không cần password
                    role: 'user', // Default role
                    dateOfBirth: new Date(), // Default value
                });

                user = await userRepository.save(user);
            }

            return user;
        } catch (error) {
            throw new Error('Failed to process user data');
        }
    }

    /**
     * Xử lý toàn bộ flow đăng nhập Google
     */
    public static async handleGoogleLogin(googleAccessToken: string, deviceId?: string): Promise<LoginResult> {
        try {
            // 1. Xác thực Google token và lấy thông tin user
            const googleUserInfo = await this.verifyGoogleToken(googleAccessToken);

            // 2. Tạo hoặc cập nhật user trong database
            const user = await this.createOrUpdateUser(googleUserInfo);

            // 3. Tạo JWT tokens (stateless, managed via Redis bitmap for blacklisting)
            const payload = {
                userId: user.id,
                role: user.role
            };

            const tokenPair = JWTHelper.createTokenPair(payload);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role
                },
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken
            };
        } catch (error) {
            throw error;
        }
    }
}