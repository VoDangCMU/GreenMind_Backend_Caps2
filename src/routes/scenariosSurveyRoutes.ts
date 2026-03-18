import {Router} from "express";
import controller from "../controller";
import {jwtAuthMiddleware} from "../middlewares/jwtMiddleware";

const router = Router();

router.get('/get-survey-scenario', jwtAuthMiddleware, controller.surveyScenarios.GetSurveyScenarios);
router.post('/create-survey-scenario', jwtAuthMiddleware, controller.surveyScenarios.CreateSurveyScenario);
router.put('/attach-question/:id', jwtAuthMiddleware, controller.surveyScenarios.AttachQuestions);
router.delete('/delete-survey-scenarios/:id', jwtAuthMiddleware, controller.surveyScenarios.DeleteSurveyScenario);
router.post('/simulate-scenario/:id', jwtAuthMiddleware, controller.surveyScenarios.SimulateScenario);
router.get('/get-simulated/:id', jwtAuthMiddleware, controller.surveyScenarios.GetSimulatedDetails);
router.get('/get-all-simulated-scenarios', jwtAuthMiddleware, controller.surveyScenarios.GetAllSimulatedScenarios);
router.get('/get-user-survey-question', jwtAuthMiddleware, controller.surveyScenarios.GetUserQuestionsSurvey);
router.get('/get-user-question-set-survey', jwtAuthMiddleware, controller.surveyScenarios.GetUserQuestionSetSurveys);
router.get('/get-all-user-question', jwtAuthMiddleware, controller.surveyScenarios.GetAllQuestionByUser);
export default router;