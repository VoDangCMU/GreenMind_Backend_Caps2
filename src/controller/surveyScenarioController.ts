import {RequestHandler} from "express";
import {z} from "zod";
import NUMBER from "../config/schemas/Number";
import TEXT from "../config/schemas/Text";

import {SurveyScenario} from "../entity/survey_scenario";
import {User} from "../entity/user";
import {ScenarioAssignment} from "../entity/scenario_assignments";
import AppDataSource from "../infrastructure/database";
import {SimulatedSurvey} from "../entity/simulated_survey";
import {QuestionSets} from "../entity/question_sets";
import {Segment} from "../entity/segments";
import {BigFive, BigFiveType} from "../entity/big_five";


const SurveyScenarioParamsSchema = z.object({
    minAge: NUMBER,
    maxAge: NUMBER,
    address: z.array(z.string()).min(1, "At least one location is required").optional(),
    percentage: NUMBER,
    gender: TEXT.optional(),
});

const QuestionSetIdSchema = z.object({
    questionSetId: z.string().uuid({
        message: "Question set ID is required",
    }),
});


class SurveyScenarioController {
    private SurveyScenarioRepo = AppDataSource.getRepository(SurveyScenario);
    private UserRepo = AppDataSource.getRepository(User);
    private SimulatedSurveyRepo = AppDataSource.getRepository(SimulatedSurvey);

    public CreateSurveyScenario: RequestHandler = async (req, res) => {
        try {
            const user = await this.UserRepo.findOne({ where: { id: req.user?.userId } });
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const parsed = SurveyScenarioParamsSchema.safeParse(req.body);
            if (!parsed.success)
                return res.status(400).json({
                    success: false,
                    message: "Invalid input",
                    error: parsed.error.format(),
                });

            const { minAge, maxAge, percentage, address, gender } = parsed.data;

            if (minAge > maxAge)
                return res.status(400).json({ success: false, message: "Min age cannot be greater than max age" });

            if (percentage <= 0 || percentage > 100)
                return res.status(400).json({ success: false, message: "Percentage must be between 1 and 100" });

            if (!gender) {
                return res.status(400).json({ success: false, message: "Gender must be provided" });
            }
            const scenario = this.SurveyScenarioRepo.create({
                minAge,
                maxAge,
                percentage,
                location: address,
                status: "draft",
                user
            });

            if (gender.toLowerCase() !== "all") {
                scenario.gender = gender;
            }
            await this.SurveyScenarioRepo.save(scenario);

            return res.status(201).json({
                success: true,
                message: "Survey scenario created successfully",
                data: scenario,
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    public AttachQuestions: RequestHandler = async (req, res) => {
        try {
            const { id: scenarioId } = req.params;
            const parsed = QuestionSetIdSchema.safeParse(req.body);
            if (!parsed.success)
                return res.status(400).json({ success: false, message: "Invalid input", error: parsed.error.format() });

            const scenario = await this.SurveyScenarioRepo.findOne({
                where: { id: scenarioId },
            });
            if (!scenario)
                return res.status(404).json({ success: false, message: "Scenario not found" });

            const questionSet = await AppDataSource.getRepository(QuestionSets).findOne({
                where: {id: parsed.data.questionSetId},
                relations: {items: true},
            });

            if (!questionSet)
                return res.status(404).json({success: false, message: "Question set not found"});

            scenario.questionSet = questionSet;
            await this.SurveyScenarioRepo.save(scenario);

            return res.status(200).json({
                success: true,
                message: "Questions attached successfully",
                data: scenario
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    public GetSurveyScenarios: RequestHandler = async (_req, res) => {
        try {
            const scenarios = await this.SurveyScenarioRepo.find({
                relations: {
                    questionSet: true,
                    simulatedSurvey: true,
                },
                order: { createdAt: "DESC" },
            });

            return res.status(200).json({
                success: true,
                message: "Survey scenarios retrieved successfully",
                data: scenarios,
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    public DeleteSurveyScenario: RequestHandler = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.SurveyScenarioRepo.delete(id);
            if (result.affected === 0)
                return res.status(404).json({ success: false, message: "Scenario not found" });

            return res.status(200).json({
                success: true,
                message: "Survey scenario deleted successfully",
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    public SimulateScenario: RequestHandler = async (req, res) => {
        try {
            const { id: scenarioId } = req.params;

            const scenario = await this.SurveyScenarioRepo.findOne({
                where: { id: scenarioId },
                relations: {
                    questionSet: {
                        model: true
                    },
                },
            });

            if (!scenario)
                return res.status(404).json({ success: false, message: "Scenario not found" });

            if (!scenario.questionSet)
                return res.status(400).json({
                    success: false,
                    message: "Please attach one question set before simulating"
                });

            // Get modelId from questionSet
            const modelId = scenario.questionSet.model?.id;

            const { minBirthDate, maxBirthDate } = this.calculateAgeDateRange(
                scenario.minAge,
                scenario.maxAge
            );

            const eligibleQuery = this.buildEligibleUsersQuery({
                minBirthDate,
                maxBirthDate,
                location: scenario.location,
                gender: scenario.gender,
            });

            const totalEligible = await eligibleQuery.getCount();

            if (totalEligible === 0)
                return res.status(400).json({
                    success: false,
                    message: "No eligible users found for this scenario"
                });

            const targetCount = Math.ceil(totalEligible * (scenario.percentage / 100));

            const allEligibleUsers = await eligibleQuery.getMany();

            const shuffled = allEligibleUsers.sort(() => Math.random() - 0.5);
            const assignedUsers = shuffled.slice(0, targetCount);
            const unassignedUsers = shuffled.slice(targetCount);

            const today = new Date();
            const eligibleUsersData = allEligibleUsers.map((user) => {
                const dob = user.dateOfBirth ? new Date(user.dateOfBirth) : null;
                const age = dob
                    ? Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : null;

                const isAssigned = assignedUsers.some(u => u.id === user.id);

                return {
                    userId: user.id,
                    username: user.username || "",
                    fullName: user.fullName || "",
                    age,
                    gender: user.gender || null,
                    location: user.location || scenario.location || null,
                    status: (isAssigned ? "assigned" : "not_assigned") as "assigned" | "not_assigned",
                };
            });

            const result = await AppDataSource.transaction(async (manager) => {
                const assignmentRepo = manager.getRepository(ScenarioAssignment);
                const scenarioRepo = manager.getRepository(SurveyScenario);
                const simulatedRepo = manager.getRepository(SimulatedSurvey);
                const segmentRepo = manager.getRepository(Segment);
                const bigFiveRepo = manager.getRepository(BigFive);

                // Helper function to calculate age
                const calculateAge = (dateOfBirth: Date): number => {
                    const today = new Date();
                    const birthDate = new Date(dateOfBirth);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    return age;
                };

                // Helper function to normalize gender
                const normalizeGender = (gender: string): string => {
                    const g = gender.toLowerCase().trim();
                    if (g === 'nam' || g === 'male' || g === 'm') return 'male';
                    if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') return 'female';
                    return gender;
                };

                // Group users by location, exact age, gender to create segments
                const segmentMap = new Map<string, { users: User[], location: string, age: number, gender: string }>();

                for (const user of assignedUsers) {
                    const userLocation = user.location || (scenario.location ? scenario.location[0] : 'unknown');
                    const userGender = normalizeGender(user.gender || 'unknown');
                    const userAge = user.dateOfBirth ? calculateAge(user.dateOfBirth) : 25;

                    const segmentKey = `${userLocation}_${userAge}_${userGender}`;

                    if (!segmentMap.has(segmentKey)) {
                        segmentMap.set(segmentKey, {
                            users: [],
                            location: userLocation,
                            age: userAge,
                            gender: userGender
                        });
                    }
                    segmentMap.get(segmentKey)!.users.push(user);
                }

                // Create segments and BigFive records
                const createdSegments: Segment[] = [];

                if (modelId) {
                    for (const [, segmentData] of segmentMap) {
                        // Check if segment already exists with exact age
                        let segment = await segmentRepo.findOne({
                            where: {
                                modelId: modelId,
                                location: segmentData.location,
                                age: segmentData.age,
                                gender: segmentData.gender
                            }
                        });

                        if (!segment) {
                            // Create new segment with exact age
                            segment = segmentRepo.create({
                                name: `${segmentData.location}_${segmentData.age}_${segmentData.gender}`,
                                description: `Auto-generated segment for ${segmentData.location}, age ${segmentData.age}, ${segmentData.gender}`,
                                location: segmentData.location,
                                age: segmentData.age,
                                gender: segmentData.gender,
                                modelId: modelId,
                                urban: false
                            });
                            segment = await segmentRepo.save(segment);

                            // Create BigFive record for this segment
                            const bigFive = bigFiveRepo.create({
                                openness: 0.5,
                                conscientiousness: 0.5,
                                extraversion: 0.5,
                                agreeableness: 0.5,
                                neuroticism: 0.5,
                                type: BigFiveType.SEGMENT,
                                referenceId: segment.id
                            });
                            await bigFiveRepo.save(bigFive);
                        }

                        // Assign segment to all users in this group
                        for (const user of segmentData.users) {
                            user.segmentId = segment.id;
                            await manager.save(user);
                        }

                        createdSegments.push(segment);
                    }
                }

                const assignedAssignments = assignedUsers.map((user) =>
                    assignmentRepo.create({
                        scenario: { id: scenarioId } as SurveyScenario,
                        user: { id: user.id } as User,
                        status: "assigned"
                    })
                );

                const unassignedAssignments = unassignedUsers.map((user) =>
                    assignmentRepo.create({
                        scenario: { id: scenarioId } as SurveyScenario,
                        user: { id: user.id } as User,
                        status: "not_assigned"
                    })
                );

                const allAssignments = [...assignedAssignments, ...unassignedAssignments];
                await assignmentRepo.save(allAssignments);

                const simulation = simulatedRepo.create({
                    scenario: { id: scenarioId } as SurveyScenario,
                    totalEligible,
                    targetCount,
                    assignedCount: assignedAssignments.length,
                    unassignedCount: unassignedAssignments.length,
                    eligibleUsers: eligibleUsersData,
                    triggeredBy: req.user ? ({ id: (req.user as any).userId } as User) : undefined,
                    status: "completed",
                    notes: `Simulation completed: ${assignedAssignments.length} assigned, ${unassignedAssignments.length} not assigned out of ${totalEligible} eligible users. Created ${createdSegments.length} segments.`,
                });

                const savedSimulation = await simulatedRepo.save(simulation);

                await scenarioRepo.update(scenarioId, { status: "sent" });

                return {
                    assignedCount: assignedAssignments.length,
                    unassignedCount: unassignedAssignments.length,
                    totalAssignments: allAssignments.length,
                    simulationId: savedSimulation.id,
                    simulation: savedSimulation,
                    eligibleUsers: eligibleUsersData,
                    createdSegments: createdSegments.length,
                };
            });

            return res.status(200).json({
                success: true,
                message: `Scenario simulated successfully. Assigned to ${result.assignedCount} users, ${result.unassignedCount} eligible but not assigned. Created ${result.createdSegments} segments.`,
                data: {
                    scenarioId: scenario.id,
                    simulationId: result.simulationId,
                    totalEligible,
                    targetCount,
                    assigned: result.assignedCount,
                    unassigned: result.unassignedCount,
                    totalRecorded: result.totalAssignments,
                    createdSegments: result.createdSegments,
                    simulation: {
                        status: result.simulation.status,
                        createdAt: result.simulation.createdAt,
                        notes: result.simulation.notes,
                    },
                    eligibleUsers: result.eligibleUsers,
                },
            });
        } catch (error: any) {
            console.error("SimulateScenario Error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    };

    public GetSimulatedDetails: RequestHandler = async (req, res) => {
        try {
            const { id: scenarioId } = req.params;

            const simulatedSurvey = await this.SimulatedSurveyRepo.findOne({
                where: { scenario: { id: scenarioId } },
                relations: {
                    scenario: {questionSet: {items: true}},
                    triggeredBy: true,
                },
            });

            if (!simulatedSurvey)
                return res.status(404).json({
                    success: false,
                    message: "No simulation found for this scenario"
                });


            return res.status(200).json({
                success: true,
                message: "Simulated scenario details retrieved successfully",
                data: simulatedSurvey
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    };

    public GetAllSimulatedScenarios: RequestHandler = async (_req, res) => {
        if (!_req.user?.userId) {
            return res.status(404).json({
                success: false,
                message: "Unauthorized",
            })
        }
        try {
            const simulations = await this.SimulatedSurveyRepo.find({
                where: { scenario: { id: _req.user?.userId } },
                relations: {
                    scenario: {questionSet: {items: true}, user: true},
                    triggeredBy: true,
                },
                order: { createdAt: "DESC" },
            });

            if (!simulations) {
                return res.status(404).json({ success: false, message: "No simulated surveys found" });
            }

            return res.status(200).json({
                success: true,
                message: "Simulated surveys retrieved successfully",
                data: simulations,
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    public GetUserQuestionsSurvey: RequestHandler = async (req, res) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({success: false, message: "Unauthorized"});
            }

            const assignments = await AppDataSource.getRepository(ScenarioAssignment).find({
                where: {user: {id: userId}, status: "assigned"},
                relations: {
                    scenario: {
                        questionSet: {
                            items: {
                                template: true,
                                model: true,
                                questionOptions: true
                            }
                        }
                    }
                },
                order: {createAt: "DESC"}
            });

            const uniqueQuestionsMap = new Map();

            assignments.map(assignments => {
                const questions = assignments.scenario.questionSet?.items || [];
                questions.forEach(question => {
                    if (!uniqueQuestionsMap.has(question.id)) {
                        uniqueQuestionsMap.set(question.id, question);
                    }
                });
            })

            return res.status(200).json({
                success: true,
                message: "Survey questions retrieved successfully",
                data: {
                    questions: Array.from(uniqueQuestionsMap.values()),
                    count: uniqueQuestionsMap.size,
                }
            });
        } catch (error: any) {
            return res.status(500).json({success: false, message: error.message});
        }
    };

    public GetUserQuestionSetSurveys: RequestHandler = async (req, res) => {
        try {
            if(!req.user?.userId) {
                return res.status(401).json({success: false, message: "Unauthorized"});
            }

            const assignments = await AppDataSource.getRepository(ScenarioAssignment).find({
                where: {user: {id: req.user.userId}, status: "assigned"},
                relations: {
                    scenario: {
                        questionSet: {
                            items: true
                        }
                    }
                },
                order: {createAt: "DESC"}
            });

            return res.status(200).json({
                success: true,
                message: "Survey question sets retrieved successfully",
                data: assignments
            })
        } catch (e: any) {
            return res.status(500).json({success: false, message: e.message});
        }
    }

    public GetAllQuestionByUser: RequestHandler = async (req, res) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({success: false, message: "Unauthorized"});
            }

            const assignments = await AppDataSource.getRepository(ScenarioAssignment).find({
                where: {user: {id: userId}, status: "assigned"},
                relations: {
                    scenario: {
                        questionSet: {
                            items: {
                                template: true,
                                model: true,
                                questionOptions: true,
                                userAnswers: true
                            }
                        }
                    }
                },
                order: {createAt: "DESC"}
            });

            return res.status(200).json({
                success: true,
                message: "Survey questions retrieved successfully",
                data: assignments
            });
        } catch (error: any) {
            return res.status(500).json({success: false, message: error.message});
        }
    }
    private calculateAgeDateRange(minAge: number, maxAge: number) {
        const today = new Date();
        return {
            minBirthDate: new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate()),
            maxBirthDate: new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate()),
        };
    }


    private buildEligibleUsersQuery(args: {
        minBirthDate: Date;
        maxBirthDate: Date;
        location?: string[];
        gender?: string;
    }) {
        const { minBirthDate, maxBirthDate, location, gender } = args;
        const qb = this.UserRepo.createQueryBuilder("user")
            .where("user.dateOfBirth BETWEEN :minBirthDate AND :maxBirthDate", { minBirthDate, maxBirthDate });

        if (location && location.length > 0)
            qb.andWhere("user.location IN (:...locations)", { locations: location });
        if (gender)
            qb.andWhere("user.gender = :gender", { gender });

        return qb;
    }

}

export default new SurveyScenarioController();