import { Request, Response, NextFunction } from 'express';

// Интерфейс для хранения метрик времени выполнения
interface TimingMetric {
    name: string;
    description?: string;
    startTime: number;
    endTime?: number;
}

// Расширяем тип Request для хранения метрик
declare global {
    namespace Express {
        interface Request {
            timing?: {
                start: number;
                metrics: Map<string, TimingMetric>;
                addMetric: (name: string, description?: string) => void;
                endMetric: (name: string) => void;
                addSimpleMetric: (name: string, duration: number, description?: string) => void;
                startDbTimer?: () => void;
                endDbTimer?: () => void;
            };
        }
    }
}

/**
 * Middleware для измерения производительности сервера и отправки метрик
 * через Server Timing API в заголовках ответа
 */
export const serverTimingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestStart = Date.now();
    
    // Инициализируем объект для хранения метрик
    req.timing = {
        start: requestStart,
        metrics: new Map<string, TimingMetric>(),
        
        // Метод для начала измерения метрики
        addMetric: (name: string, description?: string) => {
            if (req.timing) {
                req.timing.metrics.set(name, {
                    name,
                    description,
                    startTime: Date.now()
                });
            }
        },
        
        // Метод для завершения измерения метрики
        endMetric: (name: string) => {
            if (req.timing) {
                const metric = req.timing.metrics.get(name);
                if (metric) {
                    metric.endTime = Date.now();
                    req.timing.metrics.set(name, metric);
                }
            }
        },
        
        // Метод для добавления готовой метрики
        addSimpleMetric: (name: string, duration: number, description?: string) => {
            if (req.timing) {
                req.timing.metrics.set(name, {
                    name,
                    description,
                    startTime: 0,
                    endTime: duration
                });
            }
        }
    };

    // Автоматически начинаем измерение общего времени запроса
    req.timing.addMetric('total', 'Total request processing time');

    // Перехватываем методы отправки ответа для добавления заголовков
    const originalSend = res.send;
    const originalJson = res.json;

    const addServerTimingHeaders = () => {
        if (!req.timing) return;

        // Завершаем измерение общего времени
        req.timing.endMetric('total');

        // Формируем заголовок Server-Timing
        const timingEntries: string[] = [];

        req.timing.metrics.forEach((metric) => {
            const duration = metric.endTime !== undefined 
                ? (metric.endTime - metric.startTime)
                : (Date.now() - metric.startTime);

            let entry = `${metric.name};dur=${duration}`;
            if (metric.description) {
                // Кодируем описание в base64 или убираем non-ASCII символы
                const safeDescription = metric.description
                    .replace(/[^\x20-\x7E]/g, '') // Убираем non-ASCII символы
                    .replace(/"/g, "'"); // Заменяем кавычки
                if (safeDescription.length > 0) {
                    entry += `;desc="${safeDescription}"`;
                }
            }
            timingEntries.push(entry);
        });

        // Добавляем дополнительные метрики
        const totalTime = Date.now() - requestStart;
        timingEntries.push(`server;dur=${totalTime};desc="Server processing time"`);

        // Устанавливаем заголовок
        if (timingEntries.length > 0) {
            res.setHeader('Server-Timing', timingEntries.join(', '));
        }

        // Логируем метрики в development режиме
        if (process.env.NODE_ENV === 'development') {
            console.debug('\x1b[35m%s\x1b[0m', '⏱️  SERVER TIMING METRICS:');
            req.timing.metrics.forEach((metric) => {
                const duration = metric.endTime !== undefined 
                    ? (metric.endTime - metric.startTime)
                    : (Date.now() - metric.startTime);
                console.debug('\x1b[36m%s\x1b[0m', `   ${metric.name}: ${duration}ms${metric.description ? ` (${metric.description})` : ''}`);
            });
            console.debug('\x1b[36m%s\x1b[0m', `   server: ${totalTime}ms (Server processing time)`);
        }
    };

    // Переопределяем методы ответа
    res.send = function(data) {
        addServerTimingHeaders();
        return originalSend.call(this, data);
    };

    res.json = function(data) {
        addServerTimingHeaders();
        return originalJson.call(this, data);
    };

    next();
};

/**
 * Middleware для измерения времени выполнения аутентификации
 */
export const timingAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    if (req.timing) {
        req.timing.addMetric('auth', 'Authentication processing');
        
        // Переопределяем next для завершения измерения
        const originalNext = next;
        next = (error?: any) => {
            if (req.timing) {
                req.timing.endMetric('auth');
            }
            originalNext(error);
        };
    }
    next();
};

/**
 * Декоратор для измерения времени выполнения функций
 */
export const measureTime = (metricName: string, description?: string) => {
    return (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const req = args.find(arg => arg && arg.timing);
            
            if (req && req.timing) {
                req.timing.addMetric(metricName, description);
                
                try {
                    const result = await method.apply(this, args);
                    req.timing.endMetric(metricName);
                    return result;
                } catch (error) {
                    req.timing.endMetric(metricName);
                    throw error;
                }
            } else {
                return method.apply(this, args);
            }
        };

        return descriptor;
    };
};

/**
 * Утилита для создания custom метрики времени выполнения
 */
export const createTimingMetric = (req: Request, name: string, _description?: string) => {
    return {
        end: () => {
            if (req.timing) {
                req.timing.endMetric(name);
            }
        }
    };
};

/**
 * Middleware для измерения времени работы с базой данных
 * Используется перед операциями с Prisma
 */
export const databaseTimingMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    if (req.timing) {
        // Создаем прокси для Prisma операций если они есть в req
        const startDbTimer = () => {
            if (req.timing) {
                req.timing.addMetric('db', 'Database operations');
            }
        };

        const endDbTimer = () => {
            if (req.timing) {
                req.timing.endMetric('db');
            }
        };

        // Добавляем методы для ручного управления DB таймером
        req.timing.startDbTimer = startDbTimer;
        req.timing.endDbTimer = endDbTimer;
    }
    
    next();
}; 