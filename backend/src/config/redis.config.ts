import { Redis, RedisOptions } from 'ioredis';
import { logger } from './logger';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  family: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectionName: string;
}

/**
 * Получить числовое значение из environment переменной с валидацией
 */
function getEnvNumber(envVar: string | undefined, defaultValue: string, name: string): number {
  const value = envVar || defaultValue;
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid number`);
  }
  
  return parsed;
}

/**
 * Конфигурация Redis для разных сред
 */
export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: getEnvNumber(process.env.REDIS_PORT, '6379', 'REDIS_PORT'),
  password: process.env.REDIS_PASSWORD,
  family: 4, // IPv4
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true, // Подключаемся по мере необходимости
  keepAlive: 30000, // 30 секунд keep-alive
  connectionName: 'flow-backend'
};

/**
 * Опции для Redis клиента
 */
const redisOptions: RedisOptions = {
  ...redisConfig,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry ${times}, waiting ${delay}ms`);
    return delay;
  },
  lazyConnect: redisConfig.lazyConnect
};

/**
 * Singleton Redis клиент для основных операций
 */
let redisClient: Redis | null = null;

/**
 * Singleton Redis клиент для Pub/Sub операций  
 */
let redisPubSubClient: Redis | null = null;

/**
 * Получить основной Redis клиент
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisOptions);
    
    // Обработчики событий
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });
    
    redisClient.on('ready', () => {
      logger.info('✅ Redis ready for operations');
    });
    
    redisClient.on('error', (err) => {
      logger.error('❌ Redis connection error:', err);
    });
    
    redisClient.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }
  
  return redisClient;
}

/**
 * Получить Redis клиент для Pub/Sub
 */
export function getRedisPubSubClient(): Redis {
  if (!redisPubSubClient) {
    redisPubSubClient = new Redis({
      ...redisOptions,
      connectionName: 'flow-backend-pubsub'
    });
    
    // Обработчики событий для Pub/Sub клиента
    redisPubSubClient.on('connect', () => {
      logger.info('✅ Redis Pub/Sub connected successfully');
    });
    
    redisPubSubClient.on('error', (err) => {
      logger.error('❌ Redis Pub/Sub connection error:', err);
    });
    
    redisPubSubClient.on('message', (channel, message) => {
      logger.debug(`📨 Redis message received on ${channel}:`, message);
    });
  }
  
  return redisPubSubClient;
}

/**
 * Проверка здоровья Redis соединения
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    logger.debug('🔍 Starting Redis health check...');
    logger.debug('🔧 Redis config:', JSON.stringify(redisConfig, null, 2));
    
    const client = getRedisClient();
    const result = await client.ping();
    
    if (result === 'PONG') {
      logger.debug('✅ Redis ping successful');
      return true;
    } else {
      logger.error('❌ Redis ping returned unexpected result:', result);
      return false;
    }
  } catch (error) {
    logger.error('❌ Redis health check failed:', error);
    if (error instanceof Error) {
      logger.error('❌ Error details:', error.message, error.stack);
    }
    return false;
  }
}

/**
 * Graceful shutdown Redis соединений
 */
export async function closeRedisConnections(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('✅ Redis client disconnected gracefully');
    }
    
    if (redisPubSubClient) {
      await redisPubSubClient.quit();
      redisPubSubClient = null;
      logger.info('✅ Redis Pub/Sub client disconnected gracefully');
    }
  } catch (error) {
    logger.error('❌ Error closing Redis connections:', error);
  }
}

/**
 * Префиксы ключей для разных типов данных
 */
export const REDIS_KEYS = {
  // Сессии коллаборации
  SESSIONS: 'flow:sessions',
  USER_SESSIONS: 'flow:user_sessions',
  PROJECT_SESSIONS: 'flow:project_sessions',
  
  // Pub/Sub каналы
  PROJECT_EVENTS: 'flow:project_events',
  USER_EVENTS: 'flow:user_events',
  GLOBAL_EVENTS: 'flow:global_events',
  
  // Комментарии и уведомления
  COMMENTS_EVENTS: 'flow:comments_events',
  UNREAD_COMMENTS: 'flow:unread_comments',
  COMMENT_NOTIFICATIONS: 'flow:comment_notifications',
  
  // Операции и синхронизация
  OPERATIONS: 'flow:operations',
  OPERATION_ORDERING: 'flow:operation_ordering',
  
  // Health checks
  HEALTH: 'flow:health'
} as const;

/**
 * TTL значения в секундах
 */
export const REDIS_TTL = {
  SESSION: 3600, // 1 час
  HEALTH_CHECK: 300, // 5 минут
  OPERATION_HISTORY: 86400, // 24 часа
  AWARENESS_UPDATE: 60, // 1 минута
  COMMENT_NOTIFICATION: 604800, // 7 дней
  UNREAD_COMMENTS_CACHE: 300 // 5 минут кэш для количества непрочитанных
} as const;
