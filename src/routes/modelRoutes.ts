import {Router} from "express";
import controller from "../controller";
import surveyVerifyController from "../controller/surveyVerifyController";
import {jwtAuthMiddleware} from "../middlewares/jwtMiddleware";

const modelRouter = Router();

modelRouter.post('/create', jwtAuthMiddleware, controller.model.createBehaviorModel);
// modelRouter.post('/behavior/create', jwtAuthMiddleware, controller.model.createBehaviorModel);
modelRouter.get('/getAll', jwtAuthMiddleware, controller.model.getAllModels);

// Get feedbacks by model ID - must be before /:id route
modelRouter.get('/:id/feedbacks', surveyVerifyController.getFeedbacksByModelId);

// Get all feedbacks - no auth required
modelRouter.get('/feedbacks', surveyVerifyController.getFeedbacks);

modelRouter.get('/:id', jwtAuthMiddleware, controller.model.getModelById);

export default modelRouter;