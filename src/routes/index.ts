<<<<<<< Updated upstream
import { Router } from "express";
import questionRouter from "../routes/questionRoutes";
import questionSetRouter from "../routes/questionSetRoutes";
import userRoutes from "./userRoutes";
import locationRouter from "./locationRoutes";
import templateRouter from "./templateRoutes";
import bigFiveRouter from "./bigFiveRoutes";
import behaviorRouter from "./behaviorRoutes";
import behaviorFeedbackRouter from "./behaviorFeedbackRoutes";
import userAnswersRouter from "./userAnswersRoutes";
import scenariosSurveyRouter from "./scenariosSurveyRoutes";
import modelRouter from "./modelRoutes";
import dailySpendingRouter from "./dailySpendingRoutes";
import preAppSurveyRouter from "./preAppSurveyRoutes";
import todoRouter from "./todoRoutes";
import metricsRouter from "./metricsRoutes";
import oceanMetricsRouter from "./oceanMetricsRoutes";
import brandRouter from "./brandRoutes";
import ocrRouter from "./ocrRoutes";
import healthyFoodRouter from "./healthyFoodRoutes";
import checkinRouter from "./checkinRoutes";
import mediaRouter from "./mediaRoutes";
import wasteReportRouter from "./wasteReportRoutes";
import householdRouter from "./householdRoutes";
import wasteMonitoringRouter from "./wasteMonitoringRoutes";
import environmentalImpactRouter from "./environmentalImpactRoutes";
import blogRouter from "./blogRoutes";
import campaignRouter from "./campaignRoutes";
import participantCampaignRouter from "./participantCampaignRoutes";
import collectorRouter from "./collectorRoutes";
import plantAnalysisRouter from "./plantAnalysisRoutes";
import paymentRouter from "./paymentRoutes";

const router = Router();

router.use("/auth", userRoutes);

router.use("/locations", locationRouter);
router.use("/questions", questionRouter);
router.use("/question-sets", questionSetRouter);
router.use("/templates", templateRouter);

router.use("/big-five", bigFiveRouter);
router.use("/behaviors", behaviorRouter);
router.use("/behavior-feedbacks", behaviorFeedbackRouter);
router.use("/user-answers", userAnswersRouter);
router.use("/scenarios-survey", scenariosSurveyRouter);
router.use("/models", modelRouter);
router.use("/daily-spending", dailySpendingRouter)
router.use("/pre-app-survey", preAppSurveyRouter);
router.use("/todos", todoRouter);
router.use("/metrics", metricsRouter);
router.use("/ocean-metrics", oceanMetricsRouter);
router.use("/brands", brandRouter);
router.use("/ocr", ocrRouter);
router.use("/healthy-food-ratio", healthyFoodRouter);
router.use("/checkins", checkinRouter);
router.use("/media", mediaRouter);
router.use("/waste-reports", wasteReportRouter);
router.use("/households", householdRouter);
router.use("/waste-monitoring", wasteMonitoringRouter);
router.use("/environmental-impact", environmentalImpactRouter);
router.use("/blogs", blogRouter);
router.use("/campaigns", campaignRouter);
router.use("/participant-campaigns", participantCampaignRouter);
router.use("/collectors", collectorRouter);
router.use("/payments", paymentRouter);
router.use("/plant-analysis", plantAnalysisRouter);

export default router;
=======
import { Router } from "express";
import questionRouter from "../routes/questionRoutes";
import questionSetRouter from "../routes/questionSetRoutes";
import userRoutes from "./userRoutes";
import locationRouter from "./locationRoutes";
import templateRouter from "./templateRoutes";
import bigFiveRouter from "./bigFiveRoutes";
import behaviorRouter from "./behaviorRoutes";
import behaviorFeedbackRouter from "./behaviorFeedbackRoutes";
import userAnswersRouter from "./userAnswersRoutes";
import scenariosSurveyRouter from "./scenariosSurveyRoutes";
import modelRouter from "./modelRoutes";
import dailySpendingRouter from "./dailySpendingRoutes";
import preAppSurveyRouter from "./preAppSurveyRoutes";
import todoRouter from "./todoRoutes";
import metricsRouter from "./metricsRoutes";
import brandRouter from "./brandRoutes";
import ocrRouter from "./ocrRoutes";
import healthyFoodRouter from "./healthyFoodRoutes";
import checkinRouter from "./checkinRoutes";
import mediaRouter from "./mediaRoutes";
import wasteReportRouter from "./wasteReportRoutes";
import householdRouter from "./householdRoutes";
import wasteMonitoringRouter from "./wasteMonitoringRoutes";
import environmentalImpactRouter from "./environmentalImpactRoutes";
import blogRouter from "./blogRoutes";
import campaignRouter from "./campaignRoutes";
import participantCampaignRouter from "./participantCampaignRoutes";
import collectorRouter from "./collectorRoutes";
import paymentRouter from "./paymentRoutes";

const router = Router();

router.use("/auth", userRoutes);

router.use("/locations", locationRouter);
router.use("/questions", questionRouter);
router.use("/question-sets", questionSetRouter);
router.use("/templates", templateRouter);

router.use("/big-five", bigFiveRouter);
router.use("/behaviors", behaviorRouter);
router.use("/behavior-feedbacks", behaviorFeedbackRouter);
router.use("/user-answers", userAnswersRouter);
router.use("/scenarios-survey", scenariosSurveyRouter);
router.use("/models", modelRouter);
router.use("/daily-spending", dailySpendingRouter)
router.use("/pre-app-survey", preAppSurveyRouter);
router.use("/todos", todoRouter);
router.use("/metrics", metricsRouter);
router.use("/brands", brandRouter);
router.use("/ocr", ocrRouter);
router.use("/healthy-food-ratio", healthyFoodRouter);
router.use("/checkins", checkinRouter);
router.use("/media", mediaRouter);
router.use("/waste-reports", wasteReportRouter);
router.use("/households", householdRouter);
router.use("/waste-monitoring", wasteMonitoringRouter);
router.use("/environmental-impact", environmentalImpactRouter);
router.use("/blogs", blogRouter);
router.use("/campaigns", campaignRouter);
router.use("/participant-campaigns", participantCampaignRouter);
router.use("/collectors", collectorRouter);
router.use("/payments", paymentRouter);

export default router;
>>>>>>> Stashed changes
