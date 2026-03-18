import { Request, Response, RequestHandler } from "express";
import AppDataSource from "../infrastructure/database";
import { Todo } from "../entity/todos";
import { Metrics } from "../entity/metrics";
import { BigFive } from "../entity/big_five";
import axios from "axios";

interface TodoNode {
    title: string;
    completed?: boolean;
    completedItems?: number;
    totalItems?: number;
    subtasks?: TodoNode[];
}

interface CreateTodoRequest {
    title: string;
    parent_id?: string | null;
    completed?: boolean;
}

interface CreateTodosListRequest {
    todos: CreateTodoRequest[];
}

interface ListAdherenceResponse {
    metric: string;
    vt: number;
    bt: number;
    r: number;
    n: number;
    contrib: number;
    new_ocean_score: {
        O: number;
        C: number;
        E: number;
        A: number;
        N: number;
    };
}

class TodoController {
    public createTodo: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { title, parent_id = null, completed = false } = req.body;

        if (!title) {
            res.status(400).json({ message: "Title is required" });
            return;
        }

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            if (parent_id) {
                const parent = await todoRepository.findOne({
                    where: { id: parent_id, user_id: userId }
                });

                if (!parent) {
                    res.status(404).json({ message: "Parent todo not found" });
                    return;
                }
            }

            // Get the max order for this parent
            const maxOrder = await todoRepository
                .createQueryBuilder("todo")
                .where("todo.user_id = :userId", { userId })
                .andWhere("todo.parent_id IS NULL")
                .andWhere(parent_id ? "todo.parent_id = :parent_id" : "1=1", { parent_id })
                .select("MAX(todo.order)", "maxOrder")
                .getRawOne();

            const newTodo = todoRepository.create({
                title,
                parent_id,
                completed,
                user_id: userId,
                order: (maxOrder?.maxOrder || 0) + 1
            });

            await todoRepository.save(newTodo);

            res.status(201).json({
                message: "Todo created successfully",
                data: newTodo
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Create multiple todos with the same parent
     * POST /api/todos/batch
     * Body: { todos: [{ title, parent_id?, completed? }], parent_id? }
     */
    public createTodosList: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { todos, parent_id = null } = req.body;

        if (!todos || !Array.isArray(todos) || todos.length === 0) {
            res.status(400).json({ message: "Todos array is required" });
            return;
        }

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            // Validate parent exists if parent_id is provided
            if (parent_id) {
                const parent = await todoRepository.findOne({
                    where: { id: parent_id, user_id: userId }
                });

                if (!parent) {
                    res.status(404).json({ message: "Parent todo not found" });
                    return;
                }
            }

            // Get the max order for this parent
            const maxOrder = await todoRepository
                .createQueryBuilder("todo")
                .where("todo.user_id = :userId", { userId })
                .andWhere(parent_id ? "todo.parent_id = :parent_id" : "todo.parent_id IS NULL", { parent_id })
                .select("MAX(todo.order)", "maxOrder")
                .getRawOne();

            let currentOrder = (maxOrder?.maxOrder || 0) + 1;

            const newTodos = todos.map((todo: CreateTodoRequest) => {
                const todoItem = todoRepository.create({
                    title: todo.title,
                    parent_id: todo.parent_id !== undefined ? todo.parent_id : parent_id,
                    completed: todo.completed || false,
                    user_id: userId,
                    order: currentOrder++
                });
                return todoItem;
            });

            await todoRepository.save(newTodos);

            res.status(201).json({
                message: "Todos created successfully",
                data: newTodos
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Get all todos for the current user in tree structure
     * GET /api/todos
     */
    public getTodos: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            // Get all todos for the user
            const allTodos = await todoRepository.find({
                where: { user_id: userId },
                order: { order: 'ASC' }
            });

            // Build tree structure
            const todoMap = new Map<string, any>();
            const rootTodos: any[] = [];

            // First pass: create all nodes
            allTodos.forEach(todo => {
                todoMap.set(todo.id, {
                    id: todo.id,
                    title: todo.title,
                    completed: todo.completed,
                    completedItems: 0,
                    totalItems: 0,
                    subtasks: [],
                    parent_id: todo.parent_id,
                    order: todo.order,
                    createdAt: todo.createdAt,
                    updatedAt: todo.updatedAt
                });
            });

            // Second pass: build relationships and calculate stats
            allTodos.forEach(todo => {
                const node = todoMap.get(todo.id);
                
                if (todo.parent_id) {
                    const parent = todoMap.get(todo.parent_id);
                    if (parent) {
                        parent.subtasks.push(node);
                    }
                } else {
                    rootTodos.push(node);
                }
            });

            // Calculate completedItems and totalItems recursively
            const calculateStats = (node: any): { completed: number; total: number } => {
                if (node.subtasks.length === 0) {
                    return {
                        completed: node.completed ? 1 : 0,
                        total: 1
                    };
                }

                let completed = 0;
                let total = 0;

                node.subtasks.forEach((subtask: any) => {
                    const stats = calculateStats(subtask);
                    completed += stats.completed;
                    total += stats.total;
                });

                node.completedItems = completed;
                node.totalItems = total;

                return { completed, total };
            };

            rootTodos.forEach(root => calculateStats(root));

            res.status(200).json({
                message: "Todos retrieved successfully",
                data: rootTodos
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Get a single todo by ID
     * GET /api/todos/:id
     */
    public getTodoById: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            const todo = await todoRepository.findOne({
                where: { id, user_id: userId }
            });

            if (!todo) {
                res.status(404).json({ message: "Todo not found" });
                return;
            }

            // Get subtasks
            const subtasks = await todoRepository.find({
                where: { parent_id: id, user_id: userId },
                order: { order: 'ASC' }
            });

            const result = {
                ...todo,
                subtasks
            };

            // Get list adherence from metrics table or calculate first time
            const adherenceResult = await this.getOrCalculateListAdherence(userId);


            if (adherenceResult) {
                res.status(200).json({
                    message: "Todo retrieved successfully",
                    data: result,
                    listAdherence: adherenceResult
                });
            } else {
                res.status(200).json({
                    message: "Todo retrieved successfully",
                    data: result
                });
            }
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Update a todo
     * PUT /api/todos/:id
     */
    public updateTodo: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const { title, completed, parent_id } = req.body;

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            const todo = await todoRepository.findOne({
                where: { id, user_id: userId }
            });

            if (!todo) {
                res.status(404).json({ message: "Todo not found" });
                return;
            }

            // Validate parent if changing parent_id
            if (parent_id !== undefined && parent_id !== todo.parent_id) {
                if (parent_id) {
                    // Check for circular dependency
                    if (parent_id === id) {
                        res.status(400).json({ message: "Cannot set todo as its own parent" });
                        return;
                    }

                    const parent = await todoRepository.findOne({
                        where: { id: parent_id, user_id: userId }
                    });

                    if (!parent) {
                        res.status(404).json({ message: "Parent todo not found" });
                        return;
                    }
                }
            }

            if (title !== undefined) todo.title = title;
            if (completed !== undefined) todo.completed = completed;
            if (parent_id !== undefined) todo.parent_id = parent_id;

            await todoRepository.save(todo);


            // Process list adherence after updating todo - always call API
            const adherenceResult = await this.processListAdherence(userId);

            if (adherenceResult) {
                res.status(200).json({
                    message: "Todo updated successfully",
                    data: todo,
                    listAdherence: adherenceResult
                });
            } else {
                res.status(200).json({
                    message: "Todo updated successfully",
                    data: todo
                });
            }
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Delete a todo and all its subtasks
     * DELETE /api/todos/:id
     */
    public deleteTodo: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            const todo = await todoRepository.findOne({
                where: { id, user_id: userId }
            });

            if (!todo) {
                res.status(404).json({ message: "Todo not found" });
                return;
            }

            // Delete will cascade to subtasks due to onDelete: 'CASCADE'
            await todoRepository.remove(todo);

            res.status(200).json({
                message: "Todo deleted successfully"
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Toggle todo completed status
     * PATCH /api/todos/:id/toggle
     */
    public toggleTodo: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        try {
            const todoRepository = AppDataSource.getRepository(Todo);

            const todo = await todoRepository.findOne({
                where: { id, user_id: userId }
            });

            if (!todo) {
                res.status(404).json({ message: "Todo not found" });
                return;
            }

            todo.completed = !todo.completed;
            await todoRepository.save(todo);

            res.status(200).json({
                message: "Todo toggled successfully",
                data: todo
            });
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };

    /**
     * Helper function to get all todos in flat format for list adherence API
     */
    private async getTodosForAdherence(userId: string): Promise<Array<{ task: string; done: boolean }>> {
        const todoRepository = AppDataSource.getRepository(Todo);
        const allTodos = await todoRepository.find({
            where: { user_id: userId },
            order: { order: 'ASC' }
        });

        return allTodos.map(todo => ({
            task: todo.title,
            done: todo.completed
        }));
    }

    /**
     * Helper function to call list adherence API and update metrics
     */
    private async processListAdherence(userId: string): Promise<ListAdherenceResponse | null> {

        try {
            const metricsRepository = AppDataSource.getRepository(Metrics);
            const bigFiveRepository = AppDataSource.getRepository(BigFive);

            // Get todos
            const todos = await this.getTodosForAdherence(userId);

            // Get or create base_likert from metrics
            let metricsRecord = await metricsRepository.findOne({
                where: { userId, type: 'list_adherence' },
                order: { createdAt: 'DESC' }
            });

            let baseLikert = 4; // default
            if (metricsRecord && metricsRecord.metadata && metricsRecord.metadata.base_likert) {
                baseLikert = metricsRecord.metadata.base_likert;
            }

            // Get ocean_score from big_five
            const bigFive = await bigFiveRepository.findOne({
                where: { user: { id: userId } },
                relations: ['user']
            });

            if (!bigFive) {
                return null;
            }

            const oceanScore = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism
            };

            // Call AI API
            const requestData = {
                todos,
                base_likert: baseLikert,
                weight: 0.3,
                direction: "up",
                sigma_r: 1.0,
                alpha: 0.5,
                ocean_score: oceanScore
            };

            const response = await axios.post<ListAdherenceResponse>(
                'https://ai-greenmind.khoav4.com/list_adherence',
                requestData,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const result = response.data;

            // Save to metrics table
            const newMetrics = metricsRepository.create({
                userId,
                type: 'list_adherence',
                vt: result.vt,
                bt: result.bt,
                r: result.r,
                n: result.n,
                contrib: result.contrib,
                metadata: { base_likert: baseLikert }
            });

            await metricsRepository.save(newMetrics);

            // Update big_five table
            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await bigFiveRepository.save(bigFive);


            return result;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get or calculate list adherence for a user
     */
    private async getOrCalculateListAdherence(userId: string): Promise<ListAdherenceResponse | null> {

        try {
            const metricsRepository = AppDataSource.getRepository(Metrics);
            const bigFiveRepository = AppDataSource.getRepository(BigFive);

            // Check if metrics record exists
            let metricsRecord = await metricsRepository.findOne({
                where: { userId, type: 'list_adherence' },
                order: { createdAt: 'DESC' }
            });

            if (metricsRecord) {
                // Return existing metrics
                return {
                    metric: metricsRecord.type,
                    vt: metricsRecord.vt || 0,
                    bt: metricsRecord.bt || 0,
                    r: metricsRecord.r || 0,
                    n: metricsRecord.n || 0,
                    contrib: metricsRecord.contrib || 0,
                    new_ocean_score: metricsRecord.metadata?.new_ocean_score || {
                        O: 0, C: 0, E: 0, A: 0, N: 0
                    }
                };
            }

            // If no metrics record, calculate using AI API
            const todos = await this.getTodosForAdherence(userId);

            // Default base_likert
            let baseLikert = 4;

            // Get ocean_score from big_five
            const bigFive = await bigFiveRepository.findOne({
                where: { user: { id: userId } },
                relations: ['user']
            });

            if (!bigFive) {
                return null;
            }

            const oceanScore = {
                O: bigFive.openness,
                C: bigFive.conscientiousness,
                E: bigFive.extraversion,
                A: bigFive.agreeableness,
                N: bigFive.neuroticism
            };

            // Call AI API
            const requestData = {
                todos,
                base_likert: baseLikert,
                weight: 0.3,
                direction: "up",
                sigma_r: 1.0,
                alpha: 0.5,
                ocean_score: oceanScore
            };

            const response = await axios.post<ListAdherenceResponse>(
                'https://ai-greenmind.khoav4.com/list_adherence',
                requestData,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const result = response.data;

            // Save to metrics table
            const newMetrics = metricsRepository.create({
                userId,
                type: 'list_adherence',
                vt: result.vt,
                bt: result.bt,
                r: result.r,
                n: result.n,
                contrib: result.contrib,
                metadata: { base_likert: baseLikert }
            });

            await metricsRepository.save(newMetrics);

            // Update big_five table
            bigFive.openness = result.new_ocean_score.O;
            bigFive.conscientiousness = result.new_ocean_score.C;
            bigFive.extraversion = result.new_ocean_score.E;
            bigFive.agreeableness = result.new_ocean_score.A;
            bigFive.neuroticism = result.new_ocean_score.N;

            await bigFiveRepository.save(bigFive);


            return result;
        } catch (error) {
            return null;
        }
    }
}

export default new TodoController();