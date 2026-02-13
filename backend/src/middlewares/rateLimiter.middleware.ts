import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Расширяем тип Request для rate limit
declare module 'express' {
    interface Request {
        rateLimit?: {
            limit: number;
            current: number;
            remaining: number;
            resetTime?: Date;
        };
    }
}

// Rate limiter для авторизации (более строгий)
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 запросов
    message: 'Слишком много попыток входа, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Слишком много попыток входа',
            message: 'Пожалуйста, попробуйте через 15 минут',
            retryAfter: req.rateLimit?.resetTime
        });
    },
    skip: (req: Request) => {
        // Пропускаем rate limiting для успешных запросов
        return req.ip === '::1' || req.ip === '127.0.0.1';
    }
});

// Rate limiter для регистрации
export const registrationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3, // максимум 3 регистрации с одного IP
    message: 'Слишком много регистраций с вашего IP адреса',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter для отправки email
export const emailRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 5, // максимум 5 email
    message: 'Слишком много запросов на отправку email',
    standardHeaders: true,
    legacyHeaders: false,
});

// Общий rate limiter для API
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов
    message: 'Слишком много запросов с вашего IP адреса',
    standardHeaders: true,
    legacyHeaders: false,
});