// backend/src/modules/ai/v2/services/TokenizerService.ts

export class TokenizerService {
    /**
     * Подсчитывает количество токенов в строке.
     * В реальном приложении здесь должен быть вызов полноценного токенизатора,
     * например, `tiktoken` для OpenAI или аналогов для других моделей.
     * Пока что используем очень грубую эмуляцию.
     * @param text - Входной текст
     * @returns примерное количество токенов
     */
    static count(text: string): number {
        if (!text) return 0;
        // Очень грубая оценка: ~4 символа на токен
        return Math.ceil(text.length / 4);
    }
}

