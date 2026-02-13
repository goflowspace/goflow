import "reflect-metadata";
import { Server as HTTPServer } from "http";
import app from "./app.js";
import {env} from "@config/env";
import { logger } from "@config/logger";
import { isCloud } from "@config/edition";
import { initializeImageManager } from "@modules/entities/entitiesGCS.service";

// Обработка необработанных исключений
process.on('uncaughtException', (error: Error) => {
    console.debug('\n' + '='.repeat(80));
    console.debug('\x1b[41m%s\x1b[0m', '💥 UNCAUGHT EXCEPTION 💥');
    console.debug('='.repeat(80));
    console.debug('\x1b[31m%s\x1b[0m', `❌ Error: ${error.message}`);
    console.debug('\x1b[90m%s\x1b[0m', error.stack);
    console.debug('='.repeat(80) + '\n');
    
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Обработка необработанных отклонений промисов
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.debug('\n' + '='.repeat(80));
    console.debug('\x1b[41m%s\x1b[0m', '🚫 UNHANDLED REJECTION 🚫');
    console.debug('='.repeat(80));
    console.debug('\x1b[31m%s\x1b[0m', `❌ Reason: ${reason}`);
    console.debug('\x1b[90m%s\x1b[0m', `📍 Promise: ${promise}`);
    console.debug('='.repeat(80) + '\n');
    
    logger.error('Unhandled Rejection:', { reason, promise });
    process.exit(1);
});

const PORT = env.port || 3000;

const server: HTTPServer = app.listen(PORT, async () => {
    console.debug('\x1b[32m%s\x1b[0m', `🚀 Server started successfully!`);
    console.debug('\x1b[36m%s\x1b[0m', `📍 Environment: ${env.environment}`);
    console.debug('\x1b[36m%s\x1b[0m', `📦 Edition: ${env.EDITION}`);
    console.debug('\x1b[36m%s\x1b[0m', `🌐 Port: ${PORT}`);
    console.debug('\x1b[36m%s\x1b[0m', `🕒 Time: ${new Date().toISOString()}`);
    console.debug('='.repeat(50));
    
    logger.info(`Current environment: ${env.environment}`);
    logger.info(`Edition: ${env.EDITION}`);
    logger.info(`Server running on port ${PORT}`);
    
    // Инициализация ImageManager
    try {
        console.debug('\x1b[36m%s\x1b[0m', '🖼️  Initializing ImageManager...');
        await initializeImageManager();
        console.debug('\x1b[32m%s\x1b[0m', '✅ ImageManager initialized');
    } catch (error) {
        console.error('❌ Failed to initialize ImageManager:', error);
        if (env.environment === 'production' && isCloud()) {
            process.exit(1);
        }
    }
});

// Инициализация WebSocket только для Cloud edition
let wsSystem: any;

if (isCloud()) {
    const { WebSocketSystem } = await import("@modules/websocket/di-container.inversify");
    const { RedisDIContainerFactory } = await import("@modules/websocket/di-container.redis");
    const { RedisWebSocketSystem } = await import("@modules/websocket/websocket-system.redis");
    const { setActiveWebSocketSystem } = await import("@modules/websocket/websocket-registry");

    const useRedisWebSocket = env.USE_REDIS_COLLABORATION || env.USE_REDIS_WEBSOCKETS || env.USE_REDIS_EVENT_ORDERING;

    if (useRedisWebSocket) {
        console.log('🔄 [Server] Initializing Redis WebSocket system...');
        
        const redisAvailable = await RedisDIContainerFactory.validateRedisConnection();
        
        if (redisAvailable) {
            console.log('✅ [Server] Redis available, using Redis WebSocket system');
            wsSystem = RedisWebSocketSystem.getInstance();
            await wsSystem.initializeWebSocket(server);
            setActiveWebSocketSystem(wsSystem);
            logger.info('Redis WebSocket server initialized and ready for connections');
        } else {
            console.log('⚠️ [Server] Redis unavailable, falling back to in-memory WebSocket system');
            wsSystem = WebSocketSystem.getInstance();
            wsSystem.initializeWebSocket(server);
            setActiveWebSocketSystem(wsSystem);
            logger.info('In-memory WebSocket server initialized and ready for connections');
        }
    } else {
        console.log('📝 [Server] Using in-memory WebSocket system (Redis disabled)');
        wsSystem = WebSocketSystem.getInstance();
        wsSystem.initializeWebSocket(server);
        setActiveWebSocketSystem(wsSystem);
        logger.info('In-memory WebSocket server initialized and ready for connections');
    }
} else {
    console.log('📝 [Server] OSS edition — WebSocket system disabled');
}

// Graceful shutdown
const gracefulShutdown = async () => {
    console.debug('\x1b[33m%s\x1b[0m', '🛑 Shutting down gracefully...');
    
    if (isCloud()) {
        try {
            if (wsSystem && typeof wsSystem.dispose === 'function') {
                await wsSystem.dispose();
            }
            const { clearActiveWebSocketSystem } = await import("@modules/websocket/websocket-registry");
            clearActiveWebSocketSystem();
            console.debug('\x1b[32m%s\x1b[0m', '✅ WebSocket system disposed');
        } catch (error) {
            console.error('❌ Error disposing WebSocket system:', error);
        }
    }
    
    // Закрываем HTTP сервер
    server.close(() => {
        console.debug('\x1b[32m%s\x1b[0m', '✅ HTTP server closed');
        logger.info('Process terminated');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
