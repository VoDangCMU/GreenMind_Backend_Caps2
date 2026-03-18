import {Request, Response} from 'express';
import {z} from 'zod';
import AppDataSource from '../infrastructure/database';
import {Locations} from '../entity/locations';
import {User} from '../entity/user';
import TEXT from "../config/schemas/Text";
import NUMBER from "../config/schemas/Number";
import {Between} from "typeorm";

const LocationSchema = z.object({
    latitude: NUMBER,
    longitude: NUMBER,
    address: TEXT.optional(),
    length_to_previous_location: NUMBER.optional(),
});

const LocationIdSchema = z.object({
    id: TEXT.uuid(),
});

const LocationRepository = AppDataSource.getRepository(Locations);
const UserRepository = AppDataSource.getRepository(User);

function validateLocationParams(req: Request, res: Response) {
    const parsed = LocationSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json(parsed.error);
        return null;
    }
    return parsed.data;
}

class LocationController {
    // User gửi vị trí hiện tại của họ
    public async createLocation(req: Request, res: Response) {
        const data = validateLocationParams(req, res);
        if (!data) return;

        // Lấy userId từ JWT token
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.userId;

        try {
            // Kiểm tra user có tồn tại không
            const existedUser = await UserRepository.findOne({
                where: {id: userId}
            });

            if (!existedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Tạo location mới với vị trí hiện tại của user
            const location = LocationRepository.create({
                userId: userId,
                user: existedUser,
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.address || undefined,
                lengthToPreviousLocation: data.length_to_previous_location || undefined,
            });

            const savedLocation = await LocationRepository.save(location);


            return res.status(201).json({
                message: "Location saved successfully",
                data: savedLocation
            });
        } catch (e) {
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public async updateLocationById(req: Request, res: Response) {
        const data = validateLocationParams(req, res);
        if (!data) return;

        const parsed = LocationIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const locationId = parsed.data.id;

        try {
            const location = await LocationRepository.findOne({
                where: {id: locationId, userId: req.user.userId}
            });

            if (!location) {
                return res.status(404).json({ error: 'Location not found or unauthorized' });
            }

            location.latitude = data.latitude;
            location.longitude = data.longitude;
            if (data.address) location.address = data.address;
            if (data.length_to_previous_location !== undefined) {
                location.lengthToPreviousLocation = data.length_to_previous_location;
            }

            const updatedLocation = await LocationRepository.save(location);

            return res.status(200).json({
                message: "Location updated successfully",
                data: updatedLocation
            });
        } catch (e) {
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public async getLocationById(req: Request, res: Response) {
        const parsed = LocationIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const locationId = parsed.data.id;

        try {
            const location = await LocationRepository.findOne({
                where: {id: locationId, userId: req.user.userId}
            });

            if (!location) {
                return res.status(404).json({ error: 'Location not found or unauthorized' });
            }

            return res.status(200).json(location);
        } catch (e) {
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    public async deleteLocationById(req: Request, res: Response) {
        const parsed = LocationIdSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(parsed.error);
        }

        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const locationId = parsed.data.id;

        try {
            const location = await LocationRepository.findOne({
                where: {id: locationId, userId: req.user.userId}
            });

            if (!location) {
                return res.status(404).json({ error: 'Location not found or unauthorized' });
            }

            await LocationRepository.delete(locationId);

            return res.status(200).json({
                message: "Location deleted successfully",
                data: location
            });
        } catch (e) {
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }

    // Lấy vị trí mới nhất của user hiện tại
    public async GetLocations (req: Request, res: Response) {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            // Chỉ lấy location mới nhất
            const location = await LocationRepository.findOne({
                where: { userId: req.user.userId },
                order: {
                    createdAt: "DESC"
                }
            });

            if (!location) {
                return res.status(404).json({
                    message: "No location found for this user",
                    data: null
                });
            }

            return res.status(200).json({
                message: "Latest location retrieved successfully",
                data: location
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    // Lấy vị trí mới nhất của user (alias cho GetLocations)
    public async GetLatestLocation (req: Request, res: Response) {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const location = await LocationRepository.findOne({
                where: { userId: req.user.userId },
                order: {
                    createdAt: "DESC"
                }
            });
            if (!location) {
                return res.status(404).json({
                    message: "No location found for this user",
                });
            }

            return res.status(200).json({
                message: "Latest location retrieved successfully",
                data: location
            });
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    public async GetDistanceToday(req: Request, res: Response) {
        if(!req.user || !req.user.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            let startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            let endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const locations = await LocationRepository.find({
                where: {
                    userId: req.user.userId,
                    createdAt: Between(startOfDay, endOfDay)
                },
                order: {
                    createdAt: "ASC"
                },
                relations: {
                    user: true
                }

            })

            if (locations.length === 0) {
                return res.status(404).json({ message: "No locations found for today" });
            }

            const totalDistance = locations.reduce((sum, location) => {
                    return sum + (location.lengthToPreviousLocation || 0);
                }, 0
            );

            return res.status(200).json({
                message: "Total distance for today retrieved successfully",
                data: {

                    total_distance: totalDistance,
                    user: locations[0].user,
                }
            })
        } catch (e) {
            return res.status(500).json({ message: "Internal server error" });

        }
    }
}

export default new LocationController();