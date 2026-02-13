import { AISuggestionType } from '@prisma/client';
import { AIProviderInterface, AIRequestData, AISuggestionContent } from './ai-provider.interface';
import { AISanitizer } from './ai-sanitizer';
import { PromptBuilder } from './prompt-builder';

export interface AIResponseWithMetadata {
  content: string;
  metadata: {
    provider: string;
    model: string;
    prompt: string;
    context: string;
    fullResponse: string;
    tokensUsed: number;
    promptTokens: number;
    completionTokens: number;
    cost: number;
    temperature: number;
    maxTokens: number;
    responseTime: number;
    generatedAt: string;
  };
}

export abstract class BaseAIProvider implements AIProviderInterface {
  
  async generateSuggestions(data: AIRequestData): Promise<AISuggestionContent[]> {
    const { context, userSettings, suggestionType, maxTokens } = data;

    // Определяем параметры в зависимости от типа запроса
    const systemPrompt = PromptBuilder.getSystemPrompt(suggestionType || 'STRUCTURE_ONLY');
    const userPrompt = suggestionType === 'PROJECT_BIBLE' 
      ? context // Для PROJECT_BIBLE контекст уже содержит готовый промпт
      : PromptBuilder.buildUserPrompt(context, userSettings, suggestionType);
    
    const temperature = this.adjustTemperature(userSettings, suggestionType);

    // 📋 Логирование запроса к AI
    console.log('\n🤖 =========================== AI REQUEST ===========================');
    console.log(`🔧 Provider: ${this.getProviderName()}`);
    console.log(`📝 Suggestion Type: ${suggestionType || 'STRUCTURE_ONLY'}`);
    console.log(`🌡️ Temperature: ${temperature}`);
    // console.log('\n💬 SYSTEM PROMPT:');
    // console.log('-------------------------------------------------------------------');
    // console.log(systemPrompt);
    // console.log('\n👤 USER PROMPT:');
    // console.log('-------------------------------------------------------------------');
    // console.log(userPrompt);
    // console.log('===================================================================\n');

    try {
      const startTime = Date.now();
      
      // Вызываем конкретную реализацию провайдера с метаданными
      const response = await this.callAIWithMetadata(systemPrompt, userPrompt, temperature, {
        maxTokens: maxTokens || 4000
      });
      
      const responseTime = Date.now() - startTime;
      
      // Обновляем метаданные
      response.metadata.responseTime = responseTime;
      response.metadata.prompt = systemPrompt + '\n\n' + userPrompt;
      response.metadata.context = context;
      response.metadata.fullResponse = response.content;
      response.metadata.generatedAt = new Date().toISOString();
      
      // 📋 Логирование ответа AI
      console.log('\n🎯 =========================== AI RESPONSE ==========================');
      console.log(`🔧 Provider: ${this.getProviderName()}`);
      console.log(`⏱️ Response Time: ${responseTime}ms`);
      console.log(`🔢 Tokens Used: ${response.metadata.tokensUsed}`);
      console.log(`💰 Estimated Cost: $${response.metadata.cost.toFixed(6)}`);
      // console.log('\n📥 RAW RESPONSE:');
      // console.log('-------------------------------------------------------------------');
      // console.log(response.content);
      // console.log('===================================================================\n');
      
      // Используем общую логику парсинга с sanitization
      const parsedResults = this.parseAIResponse(response.content, suggestionType || 'STRUCTURE_ONLY');
      
      // Добавляем метаданные к результатам
      parsedResults.forEach(result => {
        (result as any).metadata = response.metadata;
      });
      
      // 📋 Логирование финального результата
      console.log('\n✅ ========================= PARSED RESULTS =========================');
      console.log(`🔧 Provider: ${this.getProviderName()}`);
      console.log(`📊 Results Count: ${parsedResults.length}`);
      console.log('\n🎯 FINAL RESULTS:');
      console.log('-------------------------------------------------------------------');
      parsedResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title || 'No Title'}`);
        // console.log(`   Description: ${result.description?.substring(0, 200)}${result.description?.length > 200 ? '...' : ''}`);
        console.log(`   Type: ${result.type}, Confidence: ${result.confidence}`);
        console.log('');
      });
      console.log('===================================================================\n');
      
      return parsedResults;
    } catch (error) {
      console.error(`❌ ${this.getProviderName()} API Error:`, error);
      throw new Error(`Ошибка ${this.getProviderName()} API: ${error}`);
    }
  }

  /**
   * Метод для классификации текста (не требует формата suggestions)
   */
  async classifyText(prompt: string, temperature: number = 0.2): Promise<AIResponseWithMetadata> {
    console.log('\n🤖 =========================== AI CLASSIFICATION REQUEST ===========================');
    console.log(`🔧 Provider: ${this.getProviderName()}`);
    console.log(`🌡️ Temperature: ${temperature}`);
    // console.log('\n💬 PROMPT:');
    // console.log('-------------------------------------------------------------------');
    // console.log(prompt);
    console.log('===================================================================\n');

    try {
      const startTime = Date.now();
      
      // Вызываем конкретную реализацию провайдера с метаданными
      const response = await this.callAIWithMetadata('', prompt, temperature);
      
      const responseTime = Date.now() - startTime;
      
      // Обновляем метаданные
      response.metadata.responseTime = responseTime;
      response.metadata.prompt = prompt;
      response.metadata.context = prompt;
      response.metadata.fullResponse = response.content;
      response.metadata.generatedAt = new Date().toISOString();
      
      // 📋 Логирование ответа AI
      console.log('\n🎯 =========================== AI CLASSIFICATION RESPONSE ==========================');
      console.log(`🔧 Provider: ${this.getProviderName()}`);
      console.log(`⏱️ Response Time: ${responseTime}ms`);
      console.log(`🔢 Tokens Used: ${response.metadata.tokensUsed}`);
      console.log(`💰 Estimated Cost: $${response.metadata.cost.toFixed(6)}`);
      // console.log('\n📥 RAW RESPONSE:');
      // console.log('-------------------------------------------------------------------');
      // console.log(response.content);
      // console.log('===================================================================\n');
      
      return response;
      
    } catch (error) {
      console.error('❌ AI Classification Error:', error);
      throw new Error(`Ошибка обработки ответа AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Абстрактный метод для вызова конкретного AI API
   */
  protected abstract callAI(systemPrompt: string, userPrompt: string, temperature: number): Promise<string>;

  /**
   * Новый метод для вызова AI с метаданными (должен быть реализован в наследниках)
   */
  protected async callAIWithMetadata(
    systemPrompt: string, 
    userPrompt: string, 
    temperature: number, 
    _options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponseWithMetadata> {
    // Fallback к старому методу если новый не реализован
    const content = await this.callAI(systemPrompt, userPrompt, temperature);

    // console.log('🔍 AI Response:', content);
    // console.log('💬 SYSTEM PROMPT:', systemPrompt);
    // console.log('💬 USER PROMPT:', userPrompt);
    
    return {
      content,
      metadata: {
        provider: this.getProviderName().toLowerCase(),
        model: 'unknown',
        prompt: userPrompt,
        context: systemPrompt,
        fullResponse: content,
        tokensUsed: 0,
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        temperature,
        maxTokens: 4000,
        responseTime: 0,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Абстрактный метод для получения имени провайдера
   */
  protected abstract getProviderName(): string;

  /**
   * Общая логика определения температуры для всех провайдеров
   */
  protected adjustTemperature(userSettings: any, suggestionType?: AISuggestionType): number {
    const baseCreativity = userSettings?.creativityLevel || 0.7;
    
    switch (suggestionType) {
      case 'REPHRASE_NARRATIVE':
      case 'REPHRASE_CHOICE':
        return Math.min(baseCreativity + 0.1, 0.9);
      case 'STRUCTURE_ONLY':
        return Math.max(baseCreativity - 0.2, 0.3);
      case 'NEXT_NODES':
        return baseCreativity;
      case 'PROJECT_BIBLE':
        return Math.max(baseCreativity - 0.1, 0.4);
      default:
        return baseCreativity;
    }
  }

  /**
   * Экранирует кавычки внутри JSON строковых значений
   */
  private escapeQuotesInJsonValues(jsonString: string): string {
    // Используем регулярное выражение для поиска строковых значений JSON (после двоеточия)
    // и экранирования кавычек внутри них
    return jsonString.replace(
      /(":\s*")(.*?)("(?=\s*[,}\]]|$))/g,
      (_, prefix, content, suffix) => {
        // Заменяем неэкранированные кавычки на экранированные
        let escapedContent = content;
        
        // Сначала временно заменяем уже экранированные кавычки
        const placeholder = '__ESCAPED_QUOTE__';
        escapedContent = escapedContent.replace(/\\"/g, placeholder);
        
        // Экранируем оставшиеся кавычки
        escapedContent = escapedContent.replace(/"/g, '\\"');
        
        // Возвращаем обратно уже экранированные кавычки
        escapedContent = escapedContent.replace(new RegExp(placeholder, 'g'), '\\"');
        
        return prefix + escapedContent + suffix;
      }
    );
  }

  /**
   * Общая логика парсинга ответа AI с sanitization
   */
  protected parseAIResponse(content: string, suggestionType: AISuggestionType): AISuggestionContent[] {
    try {
      // Первичная очистка ответа от системных упоминаний
      let sanitizedContent = AISanitizer.sanitizeAIResponse(content);
      
      // Обработка markdown блоков (специфично для некоторых провайдеров)
      console.log('🔍 Before markdown cleanup:', sanitizedContent.substring(0, 100) + '...');
      sanitizedContent = this.cleanMarkdownBlocks(sanitizedContent);
      console.log('🔍 After markdown cleanup:', sanitizedContent.substring(0, 100) + '...');

      // Дополнительная очистка управляющих символов для корректного JSON парсинга
      sanitizedContent = sanitizedContent
        .replace(/[\x00-\x1F\x7F]/g, '') // Удаляем управляющие символы
        .replace(/\n/g, '\\n') // Экранируем переносы строк в JSON
        .replace(/\r/g, '\\r') // Экранируем возвраты каретки
        .replace(/\t/g, '\\t'); // Экранируем табы
      
      // Экранируем кавычки внутри строковых значений JSON
      sanitizedContent = this.escapeQuotesInJsonValues(sanitizedContent);

      const parsed = JSON.parse(sanitizedContent);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Неверный формат ответа: отсутствует массив suggestions');
      }

      return parsed.suggestions.map((suggestion: any, index: number) => {
        try {
          // Логируем входные данные для отладки
          console.log(`🔍 Processing suggestion ${index + 1}:`);
          console.log(`   Title type: ${typeof suggestion.title}, value:`, suggestion.title);
          
          // Используем AISanitizer для комплексной очистки
          const cleanDescription = AISanitizer.sanitizeText(suggestion.description);
          const cleanTitle = AISanitizer.sanitizeText(suggestion.title);
          const cleanExplanation = AISanitizer.sanitizeForJSON(suggestion.explanation);
          
          console.log(`   ✅ Cleaned title: ${cleanTitle}`);
          console.log(`   ✅ Cleaned description: ${cleanDescription.substring(0, 100)}${cleanDescription.length > 100 ? '...' : ''}`);
          console.log(`   ✅ Cleaned explanation: ${cleanExplanation}`);
          
          return {
            title: cleanTitle,
            description: cleanDescription,
            explanation: cleanExplanation,
            type: AISanitizer.validateSuggestionType(suggestion.type, suggestionType),
            confidence: suggestion.confidence || 0.5,
            entities: AISanitizer.sanitizeEntityList(suggestion.entities || []),
            sequence_order: suggestion.sequence_order
          };
        } catch (suggestionError) {
          console.error(`❌ Error processing suggestion ${index + 1}:`, suggestionError);
          console.error(`   Raw suggestion:`, suggestion);
          
          // Возвращаем безопасный fallback
          return {
            title: `Suggestion ${index + 1}`,
            description: typeof suggestion.description === 'string' 
              ? suggestion.description 
              : JSON.stringify(suggestion.description || 'No description'),
            type: AISanitizer.validateSuggestionType(suggestion.type, suggestionType),
            confidence: 0.3,
            entities: [],
            sequence_order: suggestion.sequence_order
          };
        }
      });
    } catch (error) {
      console.error(`❌ Ошибка парсинга ответа ${this.getProviderName()}:`, error);
      console.error('Содержимое ответа:', content);
      throw new Error(`Ошибка обработки ответа AI: ${error}`);
    }
  }

  /**
   * Очистка markdown блоков - может быть переопределена в наследниках
   */
  protected cleanMarkdownBlocks(content: string): string {
    // ✅ Улучшенная очистка markdown блоков для всех случаев
    console.log('🧹 cleanMarkdownBlocks input preview:', content.substring(0, 200) + '...');
    
    // 1. Обработка ```json блоков (с пробелом или без)
    if (content.includes('```json')) {
      console.log('🔍 Found ```json block, trying to extract...');
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log('✅ Successfully extracted from ```json block');
        return jsonMatch[1].trim();
      }
    }
    
    // 2. Обработка ```json блоков без пробела (как у Gemini)
    if (content.includes('```json{')) {
      console.log('🔍 Found ```json{ block (Gemini style), trying to extract...');
      const jsonDirectMatch = content.match(/```json([\s\S]*?)\s*```/);
      if (jsonDirectMatch) {
        console.log('✅ Successfully extracted from ```json{ block');
        return jsonDirectMatch[1].trim();
      }
    }
    
    // 3. Обработка обычных ``` блоков, если содержат JSON
    if (content.includes('```') && (content.includes('"suggestions"') || content.includes('{'))) {
      console.log('🔍 Found generic ``` block with JSON content, trying to extract...');
      const codeMatch = content.match(/```[a-z]*\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        const extracted = codeMatch[1].trim();
        // Проверяем что это похоже на JSON
        if (extracted.startsWith('{') || extracted.startsWith('[')) {
          console.log('✅ Successfully extracted from generic ``` block');
          return extracted;
        }
      }
    }
    
    // 4. Если нет markdown блоков, возвращаем как есть
    console.log('⚠️ No markdown blocks found, returning as is');
    return content;
  }
} 