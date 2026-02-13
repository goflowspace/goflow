import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import {requestLogger, consoleRequestLogger} from "@middlewares/logger";
import { serverTimingMiddleware } from "@middlewares/serverTiming.middleware";
import projectsRoutes from "@modules/project/project.routes";
import templatesRoutes from "@modules/project/templates.routes";
import publicRoutes from "@modules/public/public.routes";

import passport from "@config/passportConfig";
import {setupSwagger} from "@config/swagger";
import { logger } from "@config/logger";
import { errorHandler } from "@middlewares/errorHandler";
import { apiRateLimiter } from "@middlewares/rateLimiter.middleware";
import { timelineRoutes } from "@modules/timeline/timeline.routes";
import imagesRoutes from "@modules/images/images.routes";
import localizationRoutes from "@modules/localization/localization.routes";
import { createNotebookRoutes } from "@modules/notebook";
import { env } from "@config/env";
import { isCloud } from "@config/edition";

dotenv.config();

const app = express();

// Безопасность - CSP
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https:", "data:"],
            connectSrc: ["'self'", "https:", "wss:", "ws:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        },
    } : false
}));

// CORS настройки
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true, // Разрешаем отправку cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-team-id'],
}));

// Мониторинг размера запросов
app.use((req, _res, next) => {
  const contentLength = req.get('content-length');
  if (contentLength) {
    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
    if (sizeInMB > 5) { // Логируем большие запросы (>5MB)
      console.log(`📊 Large request detected: ${req.method} ${req.path} - ${sizeInMB.toFixed(2)}MB`);
    }
    if (sizeInMB > 45) { // Предупреждаем о критически больших запросах
      console.warn(`⚠️ Very large request: ${req.method} ${req.path} - ${sizeInMB.toFixed(2)}MB (close to 50MB limit)`);
    }
  }
  next();
});

// Специальная обработка для Stripe webhooks (нужен raw body) — только для Cloud
if (isCloud()) {
    app.use('/payments/webhooks/stripe', express.raw({ type: 'application/json' }));
}

// Парсинг тела запроса (увеличен лимит для работы с изображениями)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser
app.use(cookieParser());

// Server Timing API для мониторинга производительности
app.use(serverTimingMiddleware);

// Логирование
app.use(requestLogger);
app.use(consoleRequestLogger);

// Rate limiting
app.use('/api/', apiRateLimiter);

// Сессии и Passport (в OSS режиме не нужны OAuth сессии)
if (isCloud()) {
    app.use(session({
        secret: env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 15, // 15 минут
            sameSite: 'lax'
        },
        name: 'sessionId'
    }));
    app.use(passport.initialize());
    app.use(passport.session());
} else {
    app.use(passport.initialize());
}

// Middleware для логирования ошибок аутентификации
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
        if (res.statusCode === 401) {
            console.debug('\x1b[31m%s\x1b[0m', '🔐 AUTHENTICATION FAILED');
            console.debug('\x1b[33m%s\x1b[0m', `📍 Route: ${req.method} ${req.url}`);
            console.debug('\x1b[33m%s\x1b[0m', `🔑 Auth Header: ${req.headers.authorization || 'MISSING'}`);
            console.debug('\x1b[31m%s\x1b[0m', `❌ Reason: Unauthorized - JWT token missing or invalid`);
        }
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        if (res.statusCode === 401) {
            console.debug('\x1b[31m%s\x1b[0m', '🔐 AUTHENTICATION FAILED');
            console.debug('\x1b[33m%s\x1b[0m', `📍 Route: ${req.method} ${req.url}`);
            console.debug('\x1b[33m%s\x1b[0m', `🔑 Auth Header: ${req.headers.authorization || 'MISSING'}`);
            console.debug('\x1b[31m%s\x1b[0m', `❌ Reason: Unauthorized - JWT token missing or invalid`);
        }
        return originalJson.call(this, data);
    };
    
    next();
});

// Swagger документация
setupSwagger(app);

logger.info(`Initializing routes... (edition: ${env.EDITION})`);

// Маршруты, доступные в обеих edition (OSS + Cloud)
app.use("/projects", projectsRoutes);
app.use("/project-templates", templatesRoutes);
app.use("/api", timelineRoutes);
app.use("/images", imagesRoutes);
app.use("/notebook", createNotebookRoutes());
app.use("/localization", localizationRoutes);
app.use("/", publicRoutes);

// Маршруты, доступные только в Cloud edition
if (isCloud()) {
    // Ленивый импорт cloud-only модулей
    const { default: authRoutes } = await import("@modules/auth/auth.routes");
    const { default: aiRoutes } = await import("@modules/ai/ai.routes");
    const { default: teamRoutes } = await import("@modules/team/team.routes");
    const { paymentsRoutes } = await import("@modules/payments");
    const { createCommentsRoutes } = await import("@modules/comments");
    const { default: websocketRoutes } = await import("@modules/websocket/websocket.routes");
    const { default: syncRoutes } = await import("@modules/sync/sync.routes");
    const { default: feedbackRoutes } = await import("@modules/feedback/feedback.routes");
    const { default: analyticsRoutes } = await import("@modules/analytics/usage-analytics.routes");
    const { default: salesRoutes } = await import("@modules/sales/sales.routes");

    app.use("/auth", authRoutes);
    app.use("/teams", teamRoutes);
    app.use("/ai", aiRoutes);
    app.use("/payments", paymentsRoutes);
    app.use("/", createCommentsRoutes());
    app.use("/ws", websocketRoutes);
    app.use("/sync", syncRoutes);
    app.use("/feedback", feedbackRoutes);
    app.use("/analytics", analyticsRoutes);
    app.use("/sales", salesRoutes);
}

// OSS-specific маршруты
if (!isCloud()) {
    // В OSS добавляем маршрут для получения данных текущего пользователя
    const { authenticateJWT } = await import("@middlewares/auth.middleware");
    app.get("/auth/me", authenticateJWT, (req, res) => {
        res.json({ user: req.user });
    });
}

// 404 обработчик
app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не найден',
        path: req.path,
        method: req.method
    });
});

// Обработчик ошибок должен быть последним middleware
app.use(errorHandler);

export default app;
