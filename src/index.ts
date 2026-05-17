import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env";
import routes from "./routes";
import { initInfrastructure } from "./infrastructure";
import controller from "./controller";
import { corsMiddleware, devCorsMiddleware } from "./middlewares/corsMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import swaggerSpec from "./config/swagger";
import { registerCampaignScheduler } from "./runner/campaignScheduler";
import { createServer } from "http";
import { initSocketServer } from "./infrastructure/socket";
import paymentController from "./controller/paymentController";


async function startServer() {
    try {
        await initInfrastructure();

        registerCampaignScheduler();

        const app = express();
        const httpServer = createServer(app);
        
        // Initialize Socket.IO
        initSocketServer(httpServer);

        if (config.app.env === 'development') {
            app.use(devCorsMiddleware);
        } else {
            app.use(corsMiddleware);
        }

        // ⚠️ Stripe webhook MUST receive raw body for signature verification.
        // Mount BEFORE express.json() so the body is not pre-parsed.
        app.post(
            "/payments/webhook",
            express.raw({ type: "application/json" }),
            paymentController.handleWebhook,
        );

        app.use(express.json());
        app.locals.controller = controller;

        const swaggerOpts: swaggerUi.SwaggerUiOptions = {
            customSiteTitle: 'GreenMind API Docs',
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                tryItOutEnabled: true,
            },
        };

        app.use('/', swaggerUi.serve);
        app.get('/', swaggerUi.setup(swaggerSpec, swaggerOpts));

        app.use(routes);

        // 404 — route không tồn tại → JSON thay vì HTML
        app.use((req: express.Request, res: express.Response) => {
            res.status(404).json({
                message: `Cannot ${req.method} ${req.originalUrl}`,
            });
        });

        // Global error handler — handles AppError, ZodError, TypeORM errors, and unknowns
        app.use(errorMiddleware);

        httpServer.listen(config.app.port, () => {
            console.log(`Server & Socket.IO are running on port ${config.app.port}`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}

startServer();