import user from "./userController";
import questions from "./questionsController";
import template from "./templateController";
import location from "./locationController";
import bigFive from "./bigFiveController";
import behavior from "./behaviorController";
import behaviorFeedback from "./behaviorFeedbackController";
import userAnswers from "./userAnswersController";
import surveyScenarios from "./surveyScenarioController";
import dailyPending from "./dailySpendingController";
import { modelController as model } from "./modelController";
import preAppSurvey from "./preAppSurveyController";
import questionSet from "./questionSetController";
import avgDailySpendMetric from "./metrics/averageDailySpendController";
import oceanMetric from "./oceanMetricController";
import spendVariabilityMetric from "./metrics/spendVariabilityController";
import brandNoveltyMetric from "./metrics/brandNoveltyController";
import listAdherenceMetric from "./metrics/listAdherenceController";
import dailyDistanceKmMetric from "./metrics/dailyDistanceKmController";
import novelLocationRatioMetric from "./metrics/novelLocationRatioController";
import publicTransitRatioMetric from "./metrics/publicTransitRatioController";
import nightOutFreqMetric from "./metrics/nightOutFreqController";
import checkin from "./checkinController";
import household from "./householdController";
import wasteReport from "./wasteReportController";
import detectTrash from "./detectController";
import greenScore from "./greenScoreController";
import campaign from "./campaignController";

export default {
    behavior,
    behaviorFeedback,
    bigFive,
    dailyPending,
    location,
    avgDailySpendMetric,
    oceanMetric,
    spendVariabilityMetric,
    brandNoveltyMetric,
    listAdherenceMetric,
    dailyDistanceKmMetric,
    novelLocationRatioMetric,
    publicTransitRatioMetric,
    nightOutFreqMetric,
    model,
    preAppSurvey,
    questions,
    questionSet,
    surveyScenarios,
    template,
    user,
    userAnswers,
    checkin,
    household,
    wasteReport,
    detectTrash,
    greenScore,
    campaign,
};