import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { Express } from "express";
import basicAuth from "express-basic-auth";
import {env} from "@config/env";
import { logger } from "@config/logger";

const users = { [env.SWAGGER_USER as string]: env.SWAGGER_PASS as string };

const swaggerAuthMiddleware = basicAuth({
    users,
    challenge: true, // Показывает окно авторизации в браузере
    unauthorizedResponse: "Доступ запрещён"
});

const swaggerFile = path.resolve(process.cwd(), "swagger/openapi.json");

export const setupSwagger = (app: Express) => {
    if (fs.existsSync(swaggerFile)) {
        const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFile, "utf8"));
        app.use("/api-docs", swaggerAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        logger.info("Swagger доступен по адресу: http://localhost:3000/api-docs");
    } else {
        logger.error("❌ Файл openapi.json не найден!");
    }
};
