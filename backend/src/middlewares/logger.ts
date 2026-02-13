import morgan from "morgan";
import { logger } from "@config/logger";
import { Request, Response, NextFunction } from "express";

const stream = {
    write: (message: string) => logger.info(message.trim()),
};

// Кастомный middleware для детального вывода запросов в консоль
export const consoleRequestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Логируем начало запроса с деталями
    console.debug('\n' + '─'.repeat(60));
    console.debug('\x1b[36m%s\x1b[0m', `🔄 INCOMING REQUEST`);
    console.debug('\x1b[33m%s\x1b[0m', `📍 ${req.method} ${req.url}`);
    console.debug('\x1b[33m%s\x1b[0m', `🌐 IP: ${req.ip}`);
    console.debug('\x1b[33m%s\x1b[0m', `🕒 Time: ${new Date().toISOString()}`);
    
    // Логируем заголовки (только важные)
    const importantHeaders = ['authorization', 'content-type', 'user-agent', 'accept'];
    const headers = importantHeaders
        .filter(header => req.headers[header])
        .map(header => `${header}: ${req.headers[header]}`)
        .join(', ');
    
    if (headers) {
        console.debug('\x1b[90m%s\x1b[0m', `📋 Headers: ${headers}`);
    }
    
    // Логируем параметры запроса
    if (Object.keys(req.params).length > 0) {
        console.debug('\x1b[90m%s\x1b[0m', `🔗 Params: ${JSON.stringify(req.params)}`);
    }
    
    // Логируем query параметры
    if (Object.keys(req.query).length > 0) {
        console.debug('\x1b[90m%s\x1b[0m', `❓ Query: ${JSON.stringify(req.query)}`);
    }
    
    // Логируем тело запроса (только для POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const bodyStr = JSON.stringify(req.body, null, 2);
        if (bodyStr.length > 500) {
            console.debug('\x1b[90m%s\x1b[0m', `📦 Body: ${bodyStr.substring(0, 500)}... (truncated)`);
        } else {
            console.debug('\x1b[90m%s\x1b[0m', `📦 Body: ${bodyStr}`);
        }
    }
    
    // Перехватываем завершение ответа
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
        logResponse(req, res, start, data);
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        logResponse(req, res, start, data);
        return originalJson.call(this, data);
    };
    
    next();
};

function logResponse(_req: Request, res: Response, start: number, data: any) {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    
    console.debug(`${statusColor}%s\x1b[0m`, `✅ RESPONSE: ${res.statusCode} - ${duration}ms`);
    
    // Логируем тело ответа для ошибок
    if (res.statusCode >= 400 && data) {
        try {
            const responseBody = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            console.debug('\x1b[31m%s\x1b[0m', `❌ Error Response: ${responseBody}`);
        } catch (e) {
            console.debug('\x1b[31m%s\x1b[0m', `❌ Error Response: [Unable to stringify response]`);
        }
    }
    
    console.debug('─'.repeat(60) + '\n');
}

export const requestLogger = morgan(":method :url :status :response-time ms", { stream });
