import { Router } from "express";
import todoController from "../controller/todoController";
import { jwtAuthMiddleware } from "../middlewares/jwtMiddleware";

const router = Router();

// All routes require authentication
router.use(jwtAuthMiddleware);

router.post("/", todoController.createTodo);

router.post("/batch", todoController.createTodosList);

router.get("/", todoController.getTodos);

router.get("/:id", todoController.getTodoById);

router.put("/:id", todoController.updateTodo);

router.patch("/:id/toggle", todoController.toggleTodo);

router.delete("/:id", todoController.deleteTodo);

export default router;