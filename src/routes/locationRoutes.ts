import { Router } from "express";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";
import locationController from "../controller/locationController";

const router = Router();

router.use(jwtAuthMiddleware);

router.post("/", locationController.createLocation);

router.get("/latest", locationController.GetLatestLocation);

router.get("/distanceToday", locationController.GetDistanceToday);

router.get("/", locationController.GetLocations);

router.get("/:id", locationController.getLocationById);

router.put("/:id", locationController.updateLocationById);

router.delete("/:id", locationController.deleteLocationById);

router.delete("/", locationController.deleteLocations);

export default router;