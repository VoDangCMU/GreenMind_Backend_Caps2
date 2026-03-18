import { redis } from '../infrastructure/cache';

const BITMAP_KEY = 'bitmap:id_pool';
const BLACKLIST_KEY = 'bitmap:blacklist';
const BLACKLIST_EXPIRE_PREFIX = 'blacklist_expire:';

export class BitmapHelper {

    public static async allocateID(): Promise<number> {
        const id = await redis.bitpos(BITMAP_KEY, 0);
        if (id < 0) throw new Error('No available ID');
        await redis.setbit(BITMAP_KEY, id, 1);
        await redis.setbit(BLACKLIST_KEY, id, 0);
        return id;
    }

    public static async releaseID(id: number): Promise<void> {
        await redis.setbit(BITMAP_KEY, id, 0);
    }

    public static async blacklistID(id: number): Promise<void> {
        await redis.setbit(BITMAP_KEY, id, 0);
        await redis.setbit(BLACKLIST_KEY, id, 1);
    }

    public static async blacklistIDWithTTL(id: number, ttlMs: number): Promise<void> {
        await redis.setbit(BITMAP_KEY, id, 0);
        await redis.setbit(BLACKLIST_KEY, id, 1);
        await redis.set(`${BLACKLIST_EXPIRE_PREFIX}${id}`, '1', 'PX', ttlMs);
    }

    public static async isBlacklisted(id: number): Promise<boolean> {
        const bit = await redis.getbit(BLACKLIST_KEY, id);
        return bit === 1;
    }

    public static async cleanupBitmap(maxId = 100_000): Promise<void> {
        const activeIDs = new Set<number>();
        const keys = await redis.keys(`${BLACKLIST_EXPIRE_PREFIX}*`);
        for (const key of keys) {
            const match = key.match(/^blacklist_expire:(\d+)$/);
            if (match) {
                activeIDs.add(Number(match[1]));
            }
        }

        for (let id = 0; id < maxId; id++) {
            const bit = await redis.getbit(BITMAP_KEY, id);
            if (bit === 1 && !activeIDs.has(id)) {
                await redis.setbit(BITMAP_KEY, id, 0);
            }
        }
    }

    /**
     * Tạo token ID từ JWT token string
     */
    public static generateTokenId(token: string): number {
        let hash = 0;
        for (let i = 0; i < token.length; i++) {
            const char = token.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 100000;
    }

    /**
     * Blacklist token khi logout hoặc revoke
     */
    public static async blacklistToken(token: string, ttlMs?: number): Promise<void> {
        const tokenId = this.generateTokenId(token);
        if (ttlMs) {
            await this.blacklistIDWithTTL(tokenId, ttlMs);
        } else {
            await this.blacklistID(tokenId);
        }
    }

    /**
     * Kiểm tra token có bị blacklist không
     */
    public static async isTokenBlacklisted(token: string): Promise<boolean> {
        const tokenId = this.generateTokenId(token);
        return await this.isBlacklisted(tokenId);
    }
}

export default BitmapHelper;