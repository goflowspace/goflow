import { Request, Response } from "express";
import { prisma } from "@config/prisma";
import { env } from "@config/env";

export const configController = async (_req: Request, res: Response) => {
    try {
        let config = {
            "serverTime": Date.now(),
            "serverVersion": "0.2",
            "frontendUrl": env.FRONTEND_URL 
        }
        res.status(200).json(config);
    } catch (error) {
        const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
        res.status(400).json({ error: errMessage });
    }
};

export const healthController = async (_req: Request, res: Response) => {
    try {
        console.log('Health check: проверяем подключение к MongoDB...');
        console.log('DATABASE_URL начинается с:', process.env.DATABASE_URL?.substring(0, 20));
        
        // Проверяем подключение к базе данных MongoDB
        const result = await prisma.user.findFirst();
        if (!result) {
            throw new Error('MongoDB connection failed');
        }
        console.log('Health check: подключение к MongoDB успешно');
        
        res.status(200).json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: "connected",
            mongodb: "OK"
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            database: "disconnected",
            error: error instanceof Error ? error.message : "Unknown error",
            fullError: error
        });
    }
};

// Добавляем отдельный endpoint для диагностики MongoDB
export const mongoHealthController = async (_req: Request, res: Response) => {
    try {
        console.log('MongoDB диагностика...');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('DATABASE_URL присутствует:', !!process.env.DATABASE_URL);
        console.log('DATABASE_URL начинается с mongodb:', process.env.DATABASE_URL?.startsWith('mongodb'));
        
        // Попробуем подключиться к MongoDB
        const startTime = Date.now();
        const user = await prisma.user.findFirst({
            select: { id: true }
        });
        const duration = Date.now() - startTime;
        
        res.status(200).json({
            status: "MongoDB connection successful",
            queryDuration: `${duration}ms`,
            foundUser: !!user,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('MongoDB connection failed:', error);
        res.status(503).json({
            status: "MongoDB connection failed",
            errorCode: error.code,
            errorName: error.name,
            errorMessage: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

