uuidParam | src/config/swagger.ts | -
validateBehaviorParams | src/controller/behaviorController.ts | safeParse, json, status
validateBehaviorUpdateParams | src/controller/behaviorController.ts | safeParse, json, status
createBehavior | src/controller/behaviorController.ts | validateBehaviorParams, save, json, status
getBehaviorById | src/controller/behaviorController.ts | safeParse, json, status, findOne
updateBehaviorById | src/controller/behaviorController.ts | safeParse, json, status, validateBehaviorUpdateParams, findOne, save
deleteBehaviorById | src/controller/behaviorController.ts | safeParse, json, status, findOne, delete
getAllBehaviors | src/controller/behaviorController.ts | find, json, status
getAllBehaviorFeedback | src/controller/behaviorFeedbackController.ts | json, status, find
getMechanismFeedbacksByUser | src/controller/behaviorFeedbackController.ts | json, status, findOne, find, map, filter, getFullYear, getMonth, getDate
getMechanismFeedbacksByModel | src/controller/behaviorFeedbackController.ts | json, status, find, map, filter, getFullYear, getMonth, getDate
getMechanismFeedbacksAllUsers | src/controller/behaviorFeedbackController.ts | find, forEach, has, getFullYear, getMonth, getDate, set, get, push, sort, from, values, getTime, json, status
submitBigFive | src/controller/bigFiveController.ts | safeParse, json, status, findOne, create, save, parseFloat, toFixed
getBigFiveByUserId | src/controller/bigFiveController.ts | safeParse, json, status, findOne, parseFloat, toFixed
updateBigFive | src/controller/bigFiveController.ts | safeParse, json, status, findOne, save, parseFloat, toFixed
deleteBigFive | src/controller/bigFiveController.ts | safeParse, json, status, findOne, remove, parseFloat, toFixed
getAllBigFive | src/controller/bigFiveController.ts | find, map, parseFloat, toFixed, json, status
postBrand | src/controller/brandController.ts | json, status, isArray, getRepository, findOne, floor, getTime, save, create, find, processBrandNovelty
processBrandNovelty | src/controller/brandController.ts | getRepository, findOne, post, create, save
CreateCheckin | src/controller/checkinController.ts | safeParse, json, status, findOneBy, getRepository, create, save
GetCheckins | src/controller/checkinController.ts | find, json, status
UpdateCheckin | src/controller/checkinController.ts | json, status, safeParse, findOne, save
DeleteCheckin | src/controller/checkinController.ts | json, status, findOne, remove
GetCheckinsByPeriod | src/controller/checkinController.ts | json, status, find
GetCheckinsByParams | src/controller/checkinController.ts | parseInt, isNaN, json, status, find
CreateOrUpdateSpend | src/controller/dailySpendingController.ts | safeParse, json, status, findOne, setHours, save, create
createOrUpdateAverageDaily | src/controller/dailySpendingController.ts | safeParse, json, status, findOne, post, create, save, isAxiosError
getAverageDailySpend | src/controller/dailySpendingController.ts | json, status, findOne
analyzeHealthyFood | src/controller/healthyFoodController.ts | json, status, append, post, getHeaders, isAxiosError
createHousehold | src/controller/householdController.ts | safeParse, json, status, concat, find, In, filter, create, save, findOne
getHousehold | src/controller/householdController.ts | json, status, findOne
updateHousehold | src/controller/householdController.ts | safeParse, json, status, findOne, find, In, filter, concat, assign, save
deleteHouseholdMembers | src/controller/householdController.ts | json, status, all, findOne, save
validateLocationParams | src/controller/locationController.ts | safeParse, json, status
createLocation | src/controller/locationController.ts | validateLocationParams, json, status, findOne, create, save
updateLocationById | src/controller/locationController.ts | validateLocationParams, safeParse, json, status, findOne, save
getLocationById | src/controller/locationController.ts | safeParse, json, status, findOne
deleteLocationById | src/controller/locationController.ts | safeParse, json, status, findOne, delete
GetLocations | src/controller/locationController.ts | json, status, find
GetLatestLocation | src/controller/locationController.ts | json, status, findOne
GetDistanceToday | src/controller/locationController.ts | json, status, setHours, find, Between, reduce
deleteLocations | src/controller/locationController.ts | json, status, remove, find
uploadBillImage | src/controller/mediaController.ts | json, status, pop, split, randomUUID, uploadToS3, getS3Url
getAvgDailySpend | src/controller/metrics/averageDailySpendController.ts | json, status, findOne
updateAvgSpend | src/controller/metrics/averageDailySpendController.ts | json, status, safeParse, findOne, post, save, create, verifySurveyAndSaveFeedback, isAxiosError
updateAvgSpendFromHistory | src/controller/metrics/averageDailySpendController.ts | json, status, findOne, find, split, toISOString, reduce, post, safeParse, save, create, verifySurveyAndSaveFeedback, isAxiosError
getBrandNovelty | src/controller/metrics/brandNoveltyController.ts | json, status, findOne
updateBrandNovelty | src/controller/metrics/brandNoveltyController.ts | json, status, safeParse, post, findOne, save, create, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
getDailyDistanceKm | src/controller/metrics/dailyDistanceKmController.ts | json, status, findOne
updateDailyDistanceKm | src/controller/metrics/dailyDistanceKmController.ts | json, status, safeParse, post, findOne, save, create, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
getListAdherence | src/controller/metrics/listAdherenceController.ts | json, status, findOne
updateListAdherence | src/controller/metrics/listAdherenceController.ts | json, status, safeParse, post, findOne, save, create, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
getNightOutFreq | src/controller/metrics/nightOutFreqController.ts | json, status, findOne
countNightOut | src/controller/metrics/nightOutFreqController.ts | json, status, safeParse, findOne, post, create, save, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
getNovelLocationRatio | src/controller/metrics/novelLocationRatioController.ts | json, status, findOne
updateNovelLocationRatio | src/controller/metrics/novelLocationRatioController.ts | json, status, safeParse, post, findOne, save, create, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
getPublicTransitRatio | src/controller/metrics/publicTransitRatioController.ts | json, status, findOne
updatePublicTransitRatio | src/controller/metrics/publicTransitRatioController.ts | json, status, safeParse, post, findOne, save, create, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
getSpendVariability | src/controller/metrics/spendVariabilityController.ts | json, status, setHours, split, toISOString, findOne, find, map, reverse, post, safeParse, save, create
updateSpendVariability | src/controller/metrics/spendVariabilityController.ts | json, status, safeParse, post, findOne, save, setHours, split, toISOString, create, findMatchingModel, verifySurveyAndSaveFeedback, isAxiosError
createBehaviorModel | src/controller/modelController.ts | createQueryRunner, connect, startTransaction, parse, getRepository, findOne, create, toUpperCase, save, join, commitTransaction, json, status, rollbackTransaction, release
createModel | src/controller/modelController.ts | parse, getRepository, create, save, json, status
getAllModels | src/controller/modelController.ts | getRepository, find, json, status
getModelById | src/controller/modelController.ts | getRepository, findOne, json, status
processOCR | src/controller/ocrController.ts | json, status, append, post, getHeaders, getRepository, create, save, isAxiosError
getInvoices | src/controller/ocrController.ts | json, status, getRepository, find, map
submitPreAppSurvey | src/controller/preAppSurveyController.ts | safeParse, json, status, findOne, parseFloat, parseInt, create, save
updateParameters | src/controller/preAppSurveyController.ts | safeParse, json, status, findOne, save
getPreAppSurvey | src/controller/preAppSurveyController.ts | json, status, findOne
getAllPreAppSurveys | src/controller/preAppSurveyController.ts | find, json, status
deletePreAppSurvey | src/controller/preAppSurveyController.ts | json, status, findOne, remove
validateQuestionParams | src/controller/questionsController.ts | safeParse, json, status, format
validateQuestionUpdateParams | src/controller/questionsController.ts | safeParse, json, status, format
validateCreateQuestionsParams | src/controller/questionsController.ts | safeParse, json, status, format
CreateQuestion | src/controller/questionsController.ts | validateQuestionParams, findOne, json, status, match, toUpperCase, save
createQuestions | src/controller/questionsController.ts | validateCreateQuestionsParams, json, status, findOne, push, match, toUpperCase, create, save, toString, toISOString
GetQuestions | src/controller/questionsController.ts | find, json, status
GetQuestionById | src/controller/questionsController.ts | safeParse, json, status, format, findOne
UpdateQuestion | src/controller/questionsController.ts | safeParse, json, status, format, validateQuestionUpdateParams, findOne, save
DeleteQuestion | src/controller/questionsController.ts | safeParse, json, status, format, findOne, delete
GetQuestionsByTemplate | src/controller/questionsController.ts | json, status, find
GetQuestionsByOwner | src/controller/questionsController.ts | json, status, findOne, getMany, addOrderBy, orderBy, andWhere, where, leftJoinAndSelect, createQueryBuilder
getSurveyQuestions | src/controller/questionsController.ts | json, status, min, parseInt, getRepository, findOne, getFullYear, getMonth, getDate, trim, orderBy, leftJoinAndSelect, createQueryBuilder, push, floor, join, where, toLowerCase, getMany, limit, addOrderBy, map, sort, generateDefaultOptions, extractTrait, filter
generateDefaultOptions | src/controller/questionsController.ts | toLowerCase
extractTrait | src/controller/questionsController.ts | toUpperCase, match
createQuestionSet | src/controller/questionSetController.ts | safeParse, json, status, format, findOne, find, In, create, save
getQuestionSets | src/controller/questionSetController.ts | find, json, status
getQuestionSetsByOwner | src/controller/questionSetController.ts | json, status, find
getQuestionSetById | src/controller/questionSetController.ts | safeParse, json, status, format, findOne
updateQuestionSet | src/controller/questionSetController.ts | safeParse, json, status, format, findOne, save, find, In
deleteQuestionSet | src/controller/questionSetController.ts | safeParse, json, status, format, findOne, remove
CreateSurveyScenario | src/controller/surveyScenarioController.ts | findOne, json, status, safeParse, format, create, toLowerCase, save
AttachQuestions | src/controller/surveyScenarioController.ts | safeParse, json, status, format, findOne, getRepository, save
GetSurveyScenarios | src/controller/surveyScenarioController.ts | find, json, status
DeleteSurveyScenario | src/controller/surveyScenarioController.ts | delete, json, status
SimulateScenario | src/controller/surveyScenarioController.ts | findOne, json, status, calculateAgeDateRange, buildEligibleUsersQuery, getCount, ceil, getMany, sort, random, slice, map, floor, getTime, some, transaction, getRepository, normalizeGender, calculateAge, has, set, push, get, create, save, update
calculateAge | src/controller/surveyScenarioController.ts | getFullYear, getMonth, getDate
normalizeGender | src/controller/surveyScenarioController.ts | trim, toLowerCase
GetSimulatedDetails | src/controller/surveyScenarioController.ts | findOne, json, status
GetAllSimulatedScenarios | src/controller/surveyScenarioController.ts | json, status, find
GetUserQuestionsSurvey | src/controller/surveyScenarioController.ts | json, status, find, getRepository, map, forEach, has, set, from, values
GetUserQuestionSetSurveys | src/controller/surveyScenarioController.ts | json, status, find, getRepository
GetAllQuestionByUser | src/controller/surveyScenarioController.ts | json, status, find, getRepository
calculateAgeDateRange | src/controller/surveyScenarioController.ts | getFullYear, getMonth, getDate
buildEligibleUsersQuery | src/controller/surveyScenarioController.ts | where, createQueryBuilder, andWhere
verifySurvey | src/controller/surveyVerifyController.ts | json, status, post, abs, getRepository, create, save, isAxiosError
getFeedbacks | src/controller/surveyVerifyController.ts | getRepository, find, all, map, abs, has, forEach, set, push, get, from, entries, json, status
getFeedbacksByModelId | src/controller/surveyVerifyController.ts | json, status, getRepository, findOne, find, all, map, abs, has, forEach, set, push, get, from, entries
validateTemplateParams | src/controller/templateController.ts | safeParse, json, status, format
validateTemplateIdParams | src/controller/templateController.ts | safeParse, json, status, format
validateCreateTemplatesParams | src/controller/templateController.ts | safeParse, json, status, format
createTemplate | src/controller/templateController.ts | validateTemplateParams, findOne, json, status, match, toUpperCase, create, save
createTemplates | src/controller/templateController.ts | validateCreateTemplatesParams, findOne, push, match, toUpperCase, create, save, json, status
getAllTemplates | src/controller/templateController.ts | find, json, status
getTemplateById | src/controller/templateController.ts | validateTemplateIdParams, findOne, json, status
updateTemplateById | src/controller/templateController.ts | validateTemplateParams, findOne, json, status, match, toUpperCase, save
deleteTemplateById | src/controller/templateController.ts | validateTemplateIdParams, findOne, json, status, remove
createTodo | src/controller/todoController.ts | json, status, getRepository, findOne, getRawOne, select, andWhere, where, createQueryBuilder, create, save
createTodosList | src/controller/todoController.ts | json, status, isArray, getRepository, findOne, getRawOne, select, andWhere, where, createQueryBuilder, map, create, save
getTodos | src/controller/todoController.ts | json, status, getRepository, find, forEach, set, get, push, calculateStats
calculateStats | src/controller/todoController.ts | forEach, calculateStats
getTodoById | src/controller/todoController.ts | json, status, getRepository, findOne, find, getOrCalculateListAdherence
updateTodo | src/controller/todoController.ts | json, status, getRepository, findOne, save, processListAdherence
deleteTodo | src/controller/todoController.ts | json, status, getRepository, findOne, remove
toggleTodo | src/controller/todoController.ts | json, status, getRepository, findOne, save
getTodosForAdherence | src/controller/todoController.ts | getRepository, find, map
processListAdherence | src/controller/todoController.ts | getRepository, getTodosForAdherence, findOne, post, create, save
getOrCalculateListAdherence | src/controller/todoController.ts | getRepository, findOne, getTodosForAdherence, post, create, save
validateUserAnswersParams | src/controller/userAnswersController.ts | safeParse, json, status
validateUserAnswersUpdateParams | src/controller/userAnswersController.ts | safeParse, json, status
validateUserAnswersSubmitParams | src/controller/userAnswersController.ts | safeParse, json, status
submitUserAnswers | src/controller/userAnswersController.ts | validateUserAnswersSubmitParams, createQueryRunner, connect, startTransaction, getRepository, findOne, rollbackTransaction, json, status, floor, getTime, push, save, create, commitTransaction, fetch, stringify, find, getMany, where, createQueryBuilder, filter, includes, toLowerCase, normalizeGender, andWhere, release
normalizeGender | src/controller/userAnswersController.ts | trim, toLowerCase
createUserAnswer | src/controller/userAnswersController.ts | validateUserAnswersParams, findOne, json, status, save
getUserAnswerById | src/controller/userAnswersController.ts | json, status, all, findOne
getUserAnswersByUserId | src/controller/userAnswersController.ts | safeParse, json, status, find, map, toLowerCase, parseInt, isNaN
updateUserAnswer | src/controller/userAnswersController.ts | validateUserAnswersUpdateParams, safeParse, json, status, findOne, save
deleteUserAnswer | src/controller/userAnswersController.ts | safeParse, json, status, findOne, delete
getAllUserAnswers | src/controller/userAnswersController.ts | find, json, status
getUserAnswersByQuestionId | src/controller/userAnswersController.ts | json, status, find
RegisterWithEmail | src/controller/userController.ts | now, json, status, getRepository, findOne, generateUniqueUsername, hash, isNaN, getTime, toLowerCase, create, save, createTokenPair, cookie
LoginWithEmail | src/controller/userController.ts | now, json, status, getRepository, findOne, compare, getFullYear, getMonth, getDate, createTokenPair, cookie
LoginWithGoogle | src/controller/userController.ts | now, json, status, handleGoogleLogin, cookie, includes
GetProfile | src/controller/userController.ts | now, json, status, getRepository, findOne, getFullYear, getMonth, getDate
Logout | src/controller/userController.ts | now, json, status, startsWith, split, blacklistToken, clearCookie
GetAllUsers | src/controller/userController.ts | getRepository, find, all, map, findOne, json, status
DeleteUserById | src/controller/userController.ts | now, json, status, getRepository, findOne, delete
ChangeUserRole | src/controller/userController.ts | json, status, values, includes, join, getRepository, findOne, save
getReportRepo | src/controller/wasteReportController.ts | getRepository
generateReportCode | src/controller/wasteReportController.ts | getReportRepo, getRawOne, where, select, createQueryBuilder, padStart
createReport | src/controller/wasteReportController.ts | json, status, includes, join, trim, parseFloat, isNaN, getReportRepo, generateReportCode, create, save
getMyReports | src/controller/wasteReportController.ts | json, status, max, parseInt, min, getReportRepo, take, skip, orderBy, where, createQueryBuilder, andWhere, getManyAndCount
getReportById | src/controller/wasteReportController.ts | json, status, isUUID, getReportRepo, findOneBy
updateReport | src/controller/wasteReportController.ts | json, status, isUUID, includes, join, getReportRepo, findOneBy, parseFloat, save
deleteReport | src/controller/wasteReportController.ts | json, status, isUUID, getReportRepo, findOneBy, remove
getAllReports | src/controller/wasteReportController.ts | max, parseInt, min, getReportRepo, take, skip, orderBy, leftJoinAndSelect, createQueryBuilder, andWhere, getManyAndCount, map, json, status
getCollectors | src/controller/wasteReportController.ts | max, parseInt, min, getRepository, findAndCount, getReportRepo, all, map, count, json, status
assignCollector | src/controller/wasteReportController.ts | json, status, getRepository, findOneBy, getReportRepo, findOne, save
getReportsByCollector | src/controller/wasteReportController.ts | max, parseInt, min, getRepository, findOneBy, json, status, getReportRepo, take, skip, orderBy, where, leftJoinAndSelect, createQueryBuilder, andWhere, getManyAndCount, map
getAssignedReports | src/controller/wasteReportController.ts | json, status, max, parseInt, min, includes, join, getReportRepo, take, skip, orderBy, where, leftJoinAndSelect, createQueryBuilder, andWhere, getManyAndCount, map
getAssignedReportById | src/controller/wasteReportController.ts | json, status, getReportRepo, findOne
markReportDone | src/controller/wasteReportController.ts | json, status, getReportRepo, findOneBy, save
updateReportStatus | src/controller/wasteReportController.ts | json, status, includes, join, trim, getReportRepo, findOne, save
startServer | src/index.ts | initInfrastructure, express, use, json, get, setup, status, listen, exit
initInfrastructure | src/infrastructure/index.ts | initialize
adminMiddleware | src/middlewares/adminMiddleware.ts | json, status, next
staffOrAdminMiddleware | src/middlewares/adminMiddleware.ts | json, status, next
corsMiddleware | src/middlewares/corsMiddleware.ts | cors
jwtAuthMiddleware | src/middlewares/jwtMiddleware.ts | startsWith, json, status, split, verifyAccessToken, isTokenBlacklisted, next
revokeTokenMiddleware | src/middlewares/jwtMiddleware.ts | startsWith, split, blacklistToken, next
up | src/migrations/1773754347306-InitDb.ts | query
down | src/migrations/1773754347306-InitDb.ts | query
up | src/migrations/1773853186472-CreateWasteModule.ts | query
down | src/migrations/1773853186472-CreateWasteModule.ts | query
up | src/migrations/1774000000000-AddRoleTable.ts | query
down | src/migrations/1774000000000-AddRoleTable.ts | query
up | src/migrations/1774100000000-AddImageKeyToWasteReport.ts | query
down | src/migrations/1774100000000-AddImageKeyToWasteReport.ts | query
up | src/migrations/1774422030551-AddWardTableAndRefactorWasteReportTable.ts | query
down | src/migrations/1774422030551-AddWardTableAndRefactorWasteReportTable.ts | query
up | src/migrations/1774529015306-RefactorWardTable.ts | query
down | src/migrations/1774529015306-RefactorWardTable.ts | query
up | src/migrations/1774600000000-DropHouseholdFkFromWasteReport.ts | query
down | src/migrations/1774600000000-DropHouseholdFkFromWasteReport.ts | query
up | src/migrations/1774615935980-RefactorWasteReportEntity.ts | query
down | src/migrations/1774615935980-RefactorWasteReportEntity.ts | query
up | src/migrations/1774623432000-AddReportedByUserIdToWasteReport.ts | query
down | src/migrations/1774623432000-AddReportedByUserIdToWasteReport.ts | query
up | src/migrations/1774713993047-RefactorWasteReportEntity.ts | query
down | src/migrations/1774713993047-RefactorWasteReportEntity.ts | query
up | src/migrations/1774756082431-AddImageFieldsToInvoice.ts | query
down | src/migrations/1774756082431-AddImageFieldsToInvoice.ts | query
up | src/migrations/1774776023640-modifyWasteReportEntity.ts | query
down | src/migrations/1774776023640-modifyWasteReportEntity.ts | query
up | src/migrations/1774794140730-RefactorWasteReportEntity.ts | query
down | src/migrations/1774794140730-RefactorWasteReportEntity.ts | query
up | src/migrations/1774846637429-AddCodeToWasteReport.ts | query
down | src/migrations/1774846637429-AddCodeToWasteReport.ts | query
up | src/migrations/1775035725871-RefactorWasteReportEntity2.ts | query
down | src/migrations/1775035725871-RefactorWasteReportEntity2.ts | query
fileFilter | src/routes/healthyFoodRoutes.ts | startsWith, cb
fileFilter | src/routes/mediaRoutes.ts | startsWith, cb
fileFilter | src/routes/ocrRoutes.ts | startsWith, cb
run | src/runner/migration_create.ts | exit, info, resolve, exec
run | src/runner/migration_generate.ts | exit, info, resolve, exec
allocateID | src/utils/bitmapHelper.ts | bitpos, setbit
releaseID | src/utils/bitmapHelper.ts | setbit
blacklistID | src/utils/bitmapHelper.ts | setbit
blacklistIDWithTTL | src/utils/bitmapHelper.ts | setbit, set
isBlacklisted | src/utils/bitmapHelper.ts | getbit
cleanupBitmap | src/utils/bitmapHelper.ts | keys, match, add, getbit, has, setbit
generateTokenId | src/utils/bitmapHelper.ts | charCodeAt, abs
blacklistToken | src/utils/bitmapHelper.ts | generateTokenId, blacklistIDWithTTL, blacklistID
isTokenBlacklisted | src/utils/bitmapHelper.ts | generateTokenId, isBlacklisted
verifyGoogleToken | src/utils/googleLoginHelper.ts | get
createOrUpdateUser | src/utils/googleLoginHelper.ts | getRepository, findOne, save, generateUniqueUsername, create
handleGoogleLogin | src/utils/googleLoginHelper.ts | verifyGoogleToken, createOrUpdateUser, createTokenPair
createAccessToken | src/utils/jwtHelper.ts | sign
createRefreshToken | src/utils/jwtHelper.ts | sign
createTokenPair | src/utils/jwtHelper.ts | createAccessToken, createRefreshToken
verifyAccessToken | src/utils/jwtHelper.ts | verify
verifyRefreshToken | src/utils/jwtHelper.ts | verify
findMatchingModel | src/utils/modelMatcher.ts | findOne, getFullYear, getMonth, getDate, toLowerCase, find, parseInt, isNaN, abs, filter, split, includes, normalizeGender
normalizeGender | src/utils/modelMatcher.ts | trim, toLowerCase
uploadToS3 | src/utils/s3Helper.ts | send
getS3Url | src/utils/s3Helper.ts | -
removeVietnameseDiacritics | src/utils/usernameHelper.ts | join, map, split
generateBaseUsername | src/utils/usernameHelper.ts | trim, replace, toLowerCase, removeVietnameseDiacritics
generateUniqueUsername | src/utils/usernameHelper.ts | getRepository, generateBaseUsername, findOne, getMany, where, createQueryBuilder, forEach, match, add, parseInt, has
calculateAge | src/utils/verifySurveyHelper.ts | getFullYear, getMonth, getDate
normalizeGender | src/utils/verifySurveyHelper.ts | trim, toLowerCase
findChangedOceanTrait | src/utils/verifySurveyHelper.ts | abs
findMatchingModelByOceanTrait | src/utils/verifySurveyHelper.ts | getRepository, find, normalizeGender, toLowerCase, includes, toUpperCase, parseInt, isNaN
findOrCreateSegment | src/utils/verifySurveyHelper.ts | getRepository, normalizeGender, findOne, create, save
updateSegmentBigFive | src/utils/verifySurveyHelper.ts | getRepository, findOne, create, save
updateUserBigFive | src/utils/verifySurveyHelper.ts | getRepository, findOne, create, save
verifySurveyAndSaveFeedback | src/utils/verifySurveyHelper.ts | getRepository, findOne, calculateAge, findChangedOceanTrait, findMatchingModelByOceanTrait, findOrCreateSegment, updateSegmentBigFive, updateUserBigFive, post, abs, create, save