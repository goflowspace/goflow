/**
 * Хелперы для определения текущей edition приложения
 */
export const isOSS = (): boolean => process.env.NEXT_PUBLIC_EDITION === 'oss';
export const isCloud = (): boolean => process.env.NEXT_PUBLIC_EDITION !== 'oss';
