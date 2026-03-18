import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import locationController from "../controller/locationController";

const router = Router();

router.use(jwtAuthMiddleware);

// Tạo location mới (user gửi vị trí hiện tại)
router.post("/", locationController.createLocation);

router.get("/latest", locationController.GetLatestLocation);

router.get("/distanceToday", locationController.GetDistanceToday);
// Lấy tất cả locations của user hiện tại
router.get("/", locationController.GetLocations);


// Lấy một location cụ thể
router.get("/:id", locationController.getLocationById);

// Cập nhật location
router.put("/:id", locationController.updateLocationById);

// Xóa location
router.delete("/:id", locationController.deleteLocationById);

export default router;