import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env';
import { BaseAIProvider, AIResponseWithMetadata } from './base-ai-provider';

// Расширенный интерфейс для метаданных с поддержкой кеширования
interface AIResponseWithCachingMetadata extends AIResponseWithMetadata {
  metadata: AIResponseWithMetadata['metadata'] & {
    caching?: {
      enabled: boolean;
      ttl?: '5min';
      structured?: boolean;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
      cacheCost?: number;
    };
  };
}

export class AnthropicProvider extends BaseAIProvider {
  private anthropic: Anthropic;

  constructor() {
    super();
    
    if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.trim() === '') {
      throw new Error('ANTHROPIC_API_KEY не задан в переменных окружения. Добавьте его в .env.development файл или установите переменную окружения.');
    }
    
    this.anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  protected async callAI(systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    const response = await this.callAIWithMetadata(systemPrompt, userPrompt, temperature);
    return response.content;
  }

  /**
   * Вызов AI с метаданными и 5-минутным кешированием (включено по умолчанию)
   * @param systemPrompt - системный промпт
   * @param userPrompt - пользовательский промпт  
   * @param temperature - температура генерации
   * @param options - дополнительные опции
   * @param options.enableCaching - включить 5-минутное кеширование (по умолчанию true)
   */
  protected async callAIWithMetadata(
    systemPrompt: string, 
    userPrompt: string, 
    temperature: number,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      enableCaching?: boolean;
    }
  ): Promise<AIResponseWithCachingMetadata> {
    const maxTokens = options?.maxTokens || 4000;
    const model = options?.model || "claude-sonnet-4-20250514";
    const finalTemperature = options?.temperature ?? temperature;
    const enableCaching = options?.enableCaching ?? true; // 5-минутное кеширование включено по умолчанию

    console.log('🔍 SYSTEM PROMPT LENGTH:', systemPrompt.length, 'chars');
    console.log('🔍 USER PROMPT LENGTH:', userPrompt.length, 'chars');

    console.log('🔍 CACHING ENABLED:', enableCaching);
    console.log('🔍 MODEL:', model);
    
    // Проверка минимального размера для кеширования (1024 токена для Sonnet)
    const systemPromptTokens = Math.ceil(systemPrompt.length / 4);
    
    // Автоматически отключаем кеширование для коротких промптов
    let actuallyEnableCaching = enableCaching;
    if (enableCaching && systemPromptTokens < 1024) {
      console.log('⚠️  WARNING: System prompt too short for caching (need 1024+ tokens, estimated:', systemPromptTokens, ')');
      console.log('📊 CACHE REQUIREMENTS: System prompt must be ≥1024 tokens for ' + model);
      console.log('🔄 Automatically disabling caching for this request');
      actuallyEnableCaching = false;
    } else if (enableCaching) {
      console.log('✅ System prompt size OK for caching, estimated tokens:', systemPromptTokens);
    }

    // Подготавливаем system промпт с учетом кеширования
    let systemMessages: any;
    if (actuallyEnableCaching) {
      systemMessages = [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { 
            type: "ephemeral" as const // 5-минутное кеширование (единственный поддерживаемый тип)
          }
        }
      ];
      // console.log('🔍 SYSTEM MESSAGES WITH CACHING:', JSON.stringify(systemMessages, null, 2));
    } else {
      systemMessages = systemPrompt;
      // console.log('🔍 SYSTEM MESSAGES WITHOUT CACHING:', systemMessages);
    }

    const message = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: finalTemperature,
      system: systemMessages,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    // console.log('🔍 MESSAGE:', message);

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      throw new Error('Пустой ответ от Anthropic');
    }

    // Извлекаем информацию об использовании токенов
    const usage = message.usage;
    console.log('🔍 FULL USAGE OBJECT:', JSON.stringify(usage, null, 2));
    
    const promptTokens = usage.input_tokens;
    const completionTokens = usage.output_tokens;
    const cacheCreationTokens = (usage as any).cache_creation_input_tokens || 0;
    const cacheReadTokens = (usage as any).cache_read_input_tokens || 0;
    const actualTotalTokens = promptTokens + completionTokens;
    
    console.log('🔍 CACHE TOKENS EXTRACTED:');
    console.log('  - cache_creation_input_tokens:', cacheCreationTokens);
    console.log('  - cache_read_input_tokens:', cacheReadTokens);

    // Логируем информацию о кешировании
    if (actuallyEnableCaching) {
      console.log('📦 CACHE INFO:');
      console.log('  Cache creation tokens:', cacheCreationTokens);
      console.log('  Cache read tokens:', cacheReadTokens);
      console.log('  Regular input tokens:', promptTokens);
    }

    // Рассчитываем стоимость с учетом кеширования (для Claude-3.5-Sonnet)
    // Base rates: Input: $3.00 / 1M tokens, Output: $15.00 / 1M tokens
    // Cache writes: 1.25x base rate, Cache reads: 0.1x base rate
    const baseInputRate = 3.00;
    const outputRate = 15.00;
    
    let inputCost = (promptTokens / 1000000) * baseInputRate;
    let cacheCost = 0;
    
    if (actuallyEnableCaching) {
      const cacheWriteRate = baseInputRate * 1.25; // 5-минутный кеш: +25%
      const cacheReadRate = baseInputRate * 0.1;   // Чтение кеша: 10%
      
      cacheCost = (cacheCreationTokens / 1000000) * cacheWriteRate + 
                  (cacheReadTokens / 1000000) * cacheReadRate;
    }
    
    const outputCost = (completionTokens / 1000000) * outputRate;
    const totalCost = inputCost + cacheCost + outputCost;

    return {
      content: content.text,
      metadata: {
        provider: 'anthropic',
        model,
        prompt: userPrompt,
        context: systemPrompt,
        fullResponse: content.text,
        tokensUsed: actualTotalTokens,
        promptTokens,
        completionTokens,
        cost: totalCost,
        temperature: finalTemperature,
        maxTokens,
        responseTime: 0, // Будет установлено в базовом классе
        generatedAt: new Date().toISOString(),
        // Дополнительная информация о кешировании
        caching: actuallyEnableCaching ? {
          enabled: true,
          ttl: '5min',
          cacheCreationTokens,
          cacheReadTokens,
          cacheCost
        } : { enabled: false }
      }
    };
  }

  /**
   * Вызов AI с 5-минутным кешированием промпта
   * @param systemPrompt - системный промпт для кеширования
   * @param userPrompt - пользовательский промпт
   * @param temperature - температура генерации
   */
  public async callWithCaching(
    systemPrompt: string, 
    userPrompt: string, 
    temperature: number = 0.7
  ): Promise<AIResponseWithCachingMetadata> {
    return this.callAIWithMetadata(systemPrompt, userPrompt, temperature, {
      enableCaching: true
    });
  }

  /**
   * Создание структурированного промпта с несколькими точками кеширования
   * @param staticInstructions - статические инструкции (кешируются)
   * @param contextData - контекстные данные (кешируются)
   * @param userPrompt - пользовательский промпт (не кешируется)
   * @param temperature - температура генерации
   * @param options - дополнительные опции
   */
  public async callWithStructuredCaching(
    staticInstructions: string,
    contextData: string,
    userPrompt: string,
    temperature: number = 0.7,
    options?: {
      model?: string;
      maxTokens?: number;
    }
  ): Promise<AIResponseWithCachingMetadata> {
    const model = options?.model || "claude-sonnet-4-20250514";
    const maxTokens = options?.maxTokens || 4000;

    console.log('🔍 STRUCTURED CACHING - Static Instructions:', staticInstructions);
    console.log('🔍 STRUCTURED CACHING - Context Data:', contextData);
    // console.log('🔍 STRUCTURED CACHING - User Prompt:', userPrompt);

    // Создаем структурированный system промпт с двумя точками кеширования
    const systemMessages = [
      {
        type: "text" as const,
        text: staticInstructions,
        cache_control: { 
          type: "ephemeral" as const // 5-минутное кеширование (единственный поддерживаемый тип)
        }
      },
      {
        type: "text" as const, 
        text: contextData,
        cache_control: { 
          type: "ephemeral" as const // 5-минутное кеширование (единственный поддерживаемый тип)
        }
      }
    ];

    const message = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessages,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    // console.log('🔍 STRUCTURED MESSAGE:', message);

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      throw new Error('Пустой ответ от Anthropic');
    }

    // Обработка ответа аналогично основному методу
    const usage = message.usage;
    console.log('🔍 STRUCTURED FULL USAGE OBJECT:', JSON.stringify(usage, null, 2));
    
    const promptTokens = usage.input_tokens;
    const completionTokens = usage.output_tokens;
    const cacheCreationTokens = (usage as any).cache_creation_input_tokens || 0;
    const cacheReadTokens = (usage as any).cache_read_input_tokens || 0;
    const actualTotalTokens = promptTokens + completionTokens;

    console.log('📦 STRUCTURED CACHE INFO:');
    console.log('  Cache creation tokens:', cacheCreationTokens);
    console.log('  Cache read tokens:', cacheReadTokens);
    console.log('  Regular input tokens:', promptTokens);

    // Расчет стоимости
    const baseInputRate = 3.00;
    const outputRate = 15.00;
    
    let inputCost = (promptTokens / 1000000) * baseInputRate;
    const cacheWriteRate = baseInputRate * 1.25; // 5-минутный кеш: +25%
    const cacheReadRate = baseInputRate * 0.1;   // Чтение кеша: 10%
    
    const cacheCost = (cacheCreationTokens / 1000000) * cacheWriteRate + 
                      (cacheReadTokens / 1000000) * cacheReadRate;
    const outputCost = (completionTokens / 1000000) * outputRate;
    const totalCost = inputCost + cacheCost + outputCost;

    return {
      content: content.text,
      metadata: {
        provider: 'anthropic',
        model,
        prompt: userPrompt,
        context: `${staticInstructions}\n\n${contextData}`,
        fullResponse: content.text,
        tokensUsed: actualTotalTokens,
        promptTokens,
        completionTokens,
        cost: totalCost,
        temperature,
        maxTokens,
        responseTime: 0,
        generatedAt: new Date().toISOString(),
        caching: {
          enabled: true,
          ttl: '5min',
          structured: true,
          cacheCreationTokens,
          cacheReadTokens,
          cacheCost
        }
      }
    };
  }

  protected getProviderName(): string {
    return 'Anthropic';
  }
} 