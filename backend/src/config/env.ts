import dotenv from "dotenv";
import * as process from "node:process";
import crypto from "node:crypto";
import { z } from "zod";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });

console.log(`Using config file: ${envFile}`);

// Определяем edition до валидации схемы
const currentEdition = (process.env.EDITION || 'cloud') as 'oss' | 'cloud';
const isOSSEdition = currentEdition === 'oss';

// Для OSS: автогенерация JWT_SECRET если не указан
if (isOSSEdition && !process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.log('🔑 Auto-generated JWT_SECRET for OSS edition');
}
if (isOSSEdition && !process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    console.log('🔑 Auto-generated SESSION_SECRET for OSS edition');
}

const envSchema = z.object({
    EDITION: z.enum(['oss', 'cloud']).default('cloud'),
    JWT_SECRET: z.string().min(32, "JWT_SECRET должен быть минимум 32 символа"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET должен быть минимум 32 символа"),
    PORT: z.string().transform(Number).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().url("DATABASE_URL должен быть валидным URL"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().url().optional(),
    
    // GCS Configuration — опциональны для OSS
    GCS_BUCKET_NAME: isOSSEdition ? z.string().optional() : z.string().min(1, "GCS_BUCKET_NAME обязателен"),
    GCP_PROJECT_ID: isOSSEdition ? z.string().optional() : z.string().min(1, "GCP_PROJECT_ID обязателен"),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    SWAGGER_USER: z.string().optional(),
    SWAGGER_PASS: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    SLACK_FEEDBACK_WEBHOOK_URL: z.string().url().optional(),
    SLACK_SALES_WEBHOOK_URL: z.string().url().optional(),
    SLACK_SALES_MANAGER_ID: z.string().optional(), // Можно указать несколько через запятую
    FRONTEND_URL: z.string().url("FRONTEND_URL должен быть валидным URL").default("http://localhost:3000"),
    // QA авторизация
    QA_ALLOWED_DOMAIN: z.string().optional(),
    QA_WHITELIST_EMAILS: z.string().optional(),
    
    // Redis configuration
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.string().transform(Number).default("6379"),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().transform(Number).default("0"),
    REDIS_SESSION_TTL: z.string().transform(Number).default("3600"),
    REDIS_MAX_RETRIES: z.string().transform(Number).default("3"),
    REDIS_RETRY_DELAY: z.string().transform(Number).default("1000"),
    
    // Feature flags for Redis migration
    USE_REDIS_COLLABORATION: z.string().transform(s => s === 'true').default("false"),
    USE_REDIS_WEBSOCKETS: z.string().transform(s => s === 'true').default("false"),
    USE_REDIS_EVENT_ORDERING: z.string().transform(s => s === 'true').default("false"),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
    console.error("❌ Ошибка конфигурации окружения:");
    parseResult.error.errors.forEach(error => {
        console.error(`  ${error.path.join('.')}: ${error.message}`);
    });
    process.exit(1);
}

export const env = {
    EDITION: parseResult.data.EDITION,
    jwtSecret: parseResult.data.JWT_SECRET,
    SESSION_SECRET: parseResult.data.SESSION_SECRET,
    port: parseResult.data.PORT || 3000,
    environment: parseResult.data.NODE_ENV,
    databaseUrl: parseResult.data.DATABASE_URL,
    GOOGLE_CLIENT_ID: parseResult.data.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: parseResult.data.GOOGLE_CLIENT_SECRET || "",
    GOOGLE_CALLBACK_URL: parseResult.data.GOOGLE_CALLBACK_URL || "",
    
    // GCS Configuration
    GCS_BUCKET_NAME: parseResult.data.GCS_BUCKET_NAME || "",
    GCP_PROJECT_ID: parseResult.data.GCP_PROJECT_ID || "",
    GOOGLE_APPLICATION_CREDENTIALS: parseResult.data.GOOGLE_APPLICATION_CREDENTIALS || "",
    RESEND_API_KEY: parseResult.data.RESEND_API_KEY || "",
    RESEND_FROM_EMAIL: parseResult.data.RESEND_FROM_EMAIL || "",
    SWAGGER_USER: parseResult.data.SWAGGER_USER || "",
    SWAGGER_PASS: parseResult.data.SWAGGER_PASS || "",
    OPENAI_API_KEY: parseResult.data.OPENAI_API_KEY || "",
    GEMINI_API_KEY: parseResult.data.GEMINI_API_KEY || "",
    ANTHROPIC_API_KEY: parseResult.data.ANTHROPIC_API_KEY || "",
    STRIPE_SECRET_KEY: parseResult.data.STRIPE_SECRET_KEY || "",
    STRIPE_PUBLISHABLE_KEY: parseResult.data.STRIPE_PUBLISHABLE_KEY || "",
    STRIPE_WEBHOOK_SECRET: parseResult.data.STRIPE_WEBHOOK_SECRET || "",
    SLACK_FEEDBACK_WEBHOOK_URL: parseResult.data.SLACK_FEEDBACK_WEBHOOK_URL || "",
    SLACK_SALES_WEBHOOK_URL: parseResult.data.SLACK_SALES_WEBHOOK_URL || "",
    SLACK_SALES_MANAGER_ID: parseResult.data.SLACK_SALES_MANAGER_ID || "",
    FRONTEND_URL: parseResult.data.FRONTEND_URL,
    // QA авторизация
    QA_ALLOWED_DOMAIN: parseResult.data.QA_ALLOWED_DOMAIN || "",
    QA_WHITELIST_EMAILS: parseResult.data.QA_WHITELIST_EMAILS || "",
    
    // Redis configuration
    REDIS_HOST: parseResult.data.REDIS_HOST,
    REDIS_PORT: parseResult.data.REDIS_PORT,
    REDIS_PASSWORD: parseResult.data.REDIS_PASSWORD,
    REDIS_DB: parseResult.data.REDIS_DB,
    REDIS_SESSION_TTL: parseResult.data.REDIS_SESSION_TTL,
    REDIS_MAX_RETRIES: parseResult.data.REDIS_MAX_RETRIES,
    REDIS_RETRY_DELAY: parseResult.data.REDIS_RETRY_DELAY,
    
    // Feature flags for Redis migration
    USE_REDIS_COLLABORATION: parseResult.data.USE_REDIS_COLLABORATION,
    USE_REDIS_WEBSOCKETS: parseResult.data.USE_REDIS_WEBSOCKETS,
    USE_REDIS_EVENT_ORDERING: parseResult.data.USE_REDIS_EVENT_ORDERING,
};

export const isDev = env.environment === "development";
export const isProd = env.environment === "production";
export const isTest = env.environment === "test";