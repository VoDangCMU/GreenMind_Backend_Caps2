import express from "express";
import { config } from "./config/env";
import routes from "./routes";
import { initInfrastructure } from "./infrastructure";
import controller from "./controller";
import { corsMiddleware, devCorsMiddleware } from "./middlewares/corsMiddleware";

async function startServer() {
    try {
        await initInfrastructure();

        const app = express();

        // Apply CORS middleware first (before other middleware)
        if (config.app.env === 'development') {
            app.use(devCorsMiddleware);
        } else {
            app.use(corsMiddleware);
        }

        app.use(express.json());
        app.locals.controller = controller;
        app.use(routes);

        app.listen(config.app.port, () => {
            console.log(`Server is running on port ${config.app.port}`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}

startServer();