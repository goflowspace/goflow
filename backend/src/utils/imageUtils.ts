/**
 * Загружает изображение по URL и конвертирует в base64
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Go Flow-App/1.0)',
            },
        });

        if (!response.ok) {
            return null;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        return dataUrl;
    } catch (error) {
        return null;
    }
}

/**
 * Проверяет, является ли строка base64 изображением
 */
export function isBase64Image(str: string): boolean {
    return str.startsWith('data:image/');
}

/**
 * Получает размер base64 изображения в байтах
 */
export function getBase64ImageSize(base64: string): number {
    if (!isBase64Image(base64)) return 0;
    
    // Убираем префикс data:image/...;base64,
    const base64Data = base64.split(',')[1];
    if (!base64Data) return 0;
    
    // Размер base64 примерно на 33% больше оригинального размера
    return Math.floor((base64Data.length * 3) / 4);
} 