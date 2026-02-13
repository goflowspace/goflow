import { env } from "@config/env";

/**
 * Хелперы для определения текущей edition приложения
 */
export const isOSS = (): boolean => env.EDITION === 'oss';
export const isCloud = (): boolean => env.EDITION === 'cloud';
