import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string;
}

export const createError = (message: string, statusCode: number = 400): AppError => {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};

export const errorHandler = (
    error: AppError | Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    let statusCode = 500;
    let message = 'Внутренняя ошибка сервера';

    // Логируем ошибку через winston
    logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Дополнительный вывод в консоль с цветным форматированием
    console.debug('\n' + '='.repeat(80));
    console.debug('\x1b[31m%s\x1b[0m', '🚨 ERROR OCCURRED 🚨');
    console.debug('='.repeat(80));
    console.debug('\x1b[33m%s\x1b[0m', `📍 URL: ${req.method} ${req.url}`);
    console.debug('\x1b[33m%s\x1b[0m', `🌐 IP: ${req.ip}`);
    console.debug('\x1b[33m%s\x1b[0m', `🕒 Time: ${new Date().toISOString()}`);
    console.debug('\x1b[31m%s\x1b[0m', `❌ Error: ${error.message}`);
    
    if (process.env.NODE_ENV === 'development' && error.stack) {
        console.debug('\x1b[90m%s\x1b[0m', `📋 Stack trace:`);
        console.debug('\x1b[90m%s\x1b[0m', error.stack);
    }
    console.debug('='.repeat(80) + '\n');

    // Обработка различных типов ошибок
    if ('statusCode' in error && error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Обработка ошибок Prisma
        switch (error.code) {
            case 'P2002':
                statusCode = 409;
                message = 'Запись с такими данными уже существует';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Запись не найдена';
                break;
            default:
                statusCode = 400;
                message = 'Ошибка базы данных';
        }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Неверные данные запроса';
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = error.message;
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Неверный токен';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Токен истек';
    } else if (error.message === 'request entity too large') {
        statusCode = 413;
        message = 'Размер запроса слишком большой. Возможно, изображение превышает допустимый лимит (50MB)';
    }

    const response: any = {
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    // Добавляем код ошибки, если он есть
    if ('code' in error && error.code) {
        response.code = error.code;
    }

    res.status(statusCode).json(response);
};

// Wrapper для async функций
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}; 