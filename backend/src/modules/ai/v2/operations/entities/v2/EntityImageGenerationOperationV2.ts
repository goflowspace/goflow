// backend/src/modules/ai/v2/operations/entities/v2/EntityImageGenerationOperationV2.ts
import { AbstractOperation } from '../../../core/AbstractOperation';
import { OperationInput, OperationOutput, ExecutionContext, OperationType } from '../../../shared/types';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { env } from '../../../../../../config/env';
import { processImage } from '../../../../../../utils/imageProcessing';
import { ImagePromptGenerationOutputV2 } from './ImagePromptGenerationOperationV2';

/**
 * Входные данные для генерации изображения сущности v2
 */
export interface EntityImageGenerationInputV2 extends OperationInput {
  imagePrompt: ImagePromptGenerationOutputV2['imagePrompt']; // Результат генерации промпта
  imageProvider?: 'gemini' | 'openai'; // Провайдер для генерации
  imageQuality?: 'low' | 'medium' | 'high'; // Качество изображения
  processImage?: boolean; // Обрабатывать изображение (сжатие, оптимизация)
  saveToDatabase?: boolean; // Сохранять ли в БД (обычно false для пайплайнов)
}

/**
 * Выходные данные генерации изображения сущности v2
 */
export interface EntityImageGenerationOutputV2 extends OperationOutput {
  imageData: {
    imageBase64: string; // Base64 изображения
    imageUrl?: string; // URL изображения (если доступен)
    processedImage?: string; // Обработанное/сжатое изображение
    originalPrompt: string; // Исходный промпт
    revisedPrompt?: string; // Переработанный промпт (если доступен)
    metadata: {
      model: string;
      provider: string;
      width: number;
      height: number;
      aspectRatio: string;
      generatedAt: string;
      fileSize?: number; // Размер файла в байтах
      processedFileSize?: number; // Размер обработанного файла
    };
  };
  generationMetrics: {
    generationTime: number; // Время генерации в мс
    processingTime?: number; // Время обработки в мс
    success: boolean;
    errorDetails?: string;
  };
}

/**
 * Операция генерации изображения сущности v2 с использованием Gemini 2.5 Flash Image
 * Не использует AI провайдеры из архитектуры v2, так как работает с внешними API генерации изображений
 */
export class EntityImageGenerationOperationV2 extends AbstractOperation<
  EntityImageGenerationInputV2,
  EntityImageGenerationOutputV2
> {
  readonly id = 'entity-image-generation-v2';
  readonly name = 'Entity Image Generation V2';
  readonly version = '2.0.0';
  readonly type = OperationType.EXTERNAL_API; // Внешний API, не AI операция 

  private genAI: GoogleGenAI;
  private openai: OpenAI;

  constructor() {
    super();
    
    this.genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  /**
   * Валидация входных данных
   */
  validate(input: EntityImageGenerationInputV2): string[] {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
      return errors;
    }

    if (!input.imagePrompt) {
      errors.push('imagePrompt is required');
    } else {
      if (!input.imagePrompt.mainPrompt || typeof input.imagePrompt.mainPrompt !== 'string') {
        errors.push('imagePrompt.mainPrompt must be a non-empty string');
      }

      if (input.imagePrompt.mainPrompt && input.imagePrompt.mainPrompt.length < 3) {
        errors.push('imagePrompt.mainPrompt must be at least 3 characters long');
      }

      if (input.imagePrompt.mainPrompt && input.imagePrompt.mainPrompt.length > 3000) {
        errors.push('imagePrompt.mainPrompt is too long (max 3000 characters)');
      }
    }

    // Валидация провайдера
    const validProviders = ['gemini', 'openai'];
    if (input.imageProvider && !validProviders.includes(input.imageProvider)) {
      errors.push(`imageProvider must be one of: ${validProviders.join(', ')}`);
    }

    // Валидация качества
    const validQualities = ['low', 'medium', 'high'];
    if (input.imageQuality && !validQualities.includes(input.imageQuality)) {
      errors.push(`imageQuality must be one of: ${validQualities.join(', ')}`);
    }

    return errors;
  }

  /**
   * Выполнение операции генерации изображения
   */
  protected async executeOperation(input: EntityImageGenerationInputV2, context: ExecutionContext): Promise<EntityImageGenerationOutputV2> {
    const startTime = Date.now();
    const provider = input.imageProvider || 'gemini';
    
    console.log(`🖼️ =========== ${provider.toUpperCase()} IMAGE GENERATION V2 ===========`);
    console.log('🎯 Main prompt:', input.imagePrompt.mainPrompt);
    console.log('❌ Negative prompt:', input.imagePrompt.negativePrompt || 'None');
    console.log('🎨 Style modifiers:', input.imagePrompt.styleModifiers.join(', '));
    console.log('⭐ Quality keywords:', input.imagePrompt.qualityKeywords.join(', '));
    console.log('📐 Aspect ratio:', input.imagePrompt.aspectRatio);

    try {
      let result: any;
      let model: string;

      if (provider === 'openai') {
        result = await this.generateWithOpenAI(input, context);
        model = 'dall-e-3';
      } else {
        // По умолчанию используем Gemini
        result = await this.generateWithGemini(input, context);
        model = 'gemini-2.5-flash-image-preview';
      }

      const generationTime = Date.now() - startTime;
      
      // Обработка изображения если требуется
      let processedImage: string | undefined;
      let processingTime: number | undefined;
      let processedFileSize: number | undefined;

      if (input.processImage !== false && result.imageBase64) { // По умолчанию обрабатываем
        const processingStartTime = Date.now();
        try {
          // Добавляем data:image prefix если его нет
          const dataUrl = result.imageBase64.startsWith('data:') 
            ? result.imageBase64 
            : `data:image/png;base64,${result.imageBase64}`;
            
          // Подготавливаем AI метаданные
          const aiMetadata = {
            isAIGenerated: true,
            aiProvider: provider,
            aiModel: provider === 'openai' ? 'dall-e-3' : 'gemini-2.5-flash-image-preview',
            generatedAt: new Date()
          };
          
          const processedMediaValue = await processImage(dataUrl, 'generated-image.png', true, aiMetadata);
          processedImage = processedMediaValue.original.dataUrl; // Извлекаем base64 из LegacyMediaValue
          processingTime = Date.now() - processingStartTime;
          processedFileSize = processedImage ? Buffer.from(processedImage.split(',')[1] || processedImage, 'base64').length : undefined;
          console.log(`✅ Image processed successfully in ${processingTime}ms`);
        } catch (processingError) {
          console.warn('⚠️ Image processing failed:', processingError);
          // Продолжаем без обработки
        }
      }

      const originalFileSize = result.imageBase64 ? Buffer.from(result.imageBase64, 'base64').length : 0;

      const output: EntityImageGenerationOutputV2 = {
        imageData: {
          imageBase64: result.imageBase64,
          imageUrl: result.imageUrl,
          processedImage,
          originalPrompt: input.imagePrompt.mainPrompt,
          revisedPrompt: result.revisedPrompt,
          metadata: {
            model,
            provider,
            width: result.width,
            height: result.height,
            aspectRatio: input.imagePrompt.aspectRatio,
            generatedAt: new Date().toISOString(),
            fileSize: originalFileSize,
            processedFileSize
          }
        },
        generationMetrics: {
          generationTime,
          processingTime,
          success: true
        }
      };

      console.log(`✅ Image generation completed successfully in ${generationTime}ms`);
      return output;

    } catch (error) {
      const generationTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      console.error(`❌ Image generation failed after ${generationTime}ms:`, errorMessage);

      // Возвращаем ошибку как часть результата, а не бросаем исключение
      const output: EntityImageGenerationOutputV2 = {
        imageData: {
          imageBase64: '',
          originalPrompt: input.imagePrompt.mainPrompt,
          metadata: {
            model: provider === 'openai' ? 'dall-e-3' : 'gemini-2.5-flash-image-preview',
            provider,
            width: 0,
            height: 0,
            aspectRatio: input.imagePrompt.aspectRatio,
            generatedAt: new Date().toISOString()
          }
        },
        generationMetrics: {
          generationTime,
          success: false,
          errorDetails: errorMessage
        },
        error: true,
        message: `Image generation failed: ${errorMessage}`
      };

      return output;
    }
  }

  /**
   * Оценка стоимости операции
   */
  async estimateCost(input: EntityImageGenerationInputV2, _context: ExecutionContext): Promise<{realCostUSD: number, credits: number}> {
    // Примерная стоимость генерации изображений
    const provider = input.imageProvider || 'gemini';
    const quality = input.imageQuality || 'medium';
    
    let realCostUSD = 0;
    
    if (provider === 'openai') {
      // DALL-E 3 стоимость: $0.040 per image для 1024x1024
      realCostUSD = 0.040;
    } else {
      // Gemini 2.5 Flash Image стоимость: $30 per 1 million tokens, 1290 tokens per image
      realCostUSD = 0.0387; // (30 * 1290) / 1000000
    }
    
    // Учитываем качество
    const qualityMultiplier = {
      low: 0.7,
      medium: 1.0,
      high: 1.5
    };
    
    realCostUSD *= qualityMultiplier[quality];
    
    // Кредиты (условные единицы)
    const credits = Math.ceil(realCostUSD * 100); // 1 доллар = 100 кредитов
    
    return { realCostUSD, credits };
  }

  // ===== PRIVATE METHODS =====

  private async generateWithGemini(
    input: EntityImageGenerationInputV2,
    _context: ExecutionContext
  ): Promise<any> {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    // Собираем полный промпт
    const fullPrompt = this.buildFullPrompt(input.imagePrompt);

    console.log('📝 Full prompt:', fullPrompt);
    console.log('🎨 Generating with Gemini 2.5 Flash Image...');

    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: [fullPrompt]
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No images were generated by Gemini');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error('No content parts found in Gemini response');
    }

    // Найдем часть с изображением
    const imagePart = candidate.content.parts.find(part => part.inlineData);
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      throw new Error('No image data found in Gemini response');
    }

    const [width, height] = this.getAspectRatioDimensions(input.imagePrompt.aspectRatio || '1:1');

    return {
      imageBase64: imagePart.inlineData.data,
      imageUrl: null,
      width,
      height,
      revisedPrompt: null // Gemini обычно не возвращает пересмотренный промпт
    };
  }

  private async generateWithOpenAI(
    input: EntityImageGenerationInputV2,
    _context: ExecutionContext
  ): Promise<any> {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables');
    }

    // Собираем полный промпт
    const fullPrompt = this.buildFullPrompt(input.imagePrompt);

    const [width, height] = this.getAspectRatioDimensions(input.imagePrompt.aspectRatio || '1:1');
    
    // Определяем размер для OpenAI (поддерживает только определенные размеры)
    let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
    if (width > height) {
      size = '1792x1024';
    } else if (height > width) {
      size = '1024x1792';
    }

    const quality = this.mapQualityToOpenAI(input.imageQuality || 'medium');

    console.log('⚙️ OpenAI size:', size);
    console.log('⚙️ OpenAI quality:', quality);
    console.log('📝 Full prompt:', fullPrompt);

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size,
      quality,
      response_format: 'b64_json'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No images were generated by OpenAI');
    }

    const generatedImage = response.data[0];
    if (!generatedImage.b64_json) {
      throw new Error('No image data found in OpenAI response');
    }

    return {
      imageBase64: generatedImage.b64_json,
      imageUrl: generatedImage.url || null,
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      revisedPrompt: generatedImage.revised_prompt || null
    };
  }

  private buildFullPrompt(imagePrompt: any): string {
    const parts: string[] = [];
    
    // Основной промпт
    parts.push(imagePrompt.mainPrompt);
    
    // Стилевые модификаторы
    if (imagePrompt.styleModifiers && imagePrompt.styleModifiers.length > 0) {
      parts.push(imagePrompt.styleModifiers.join(', '));
    }
    
    // Ключевые слова качества
    if (imagePrompt.qualityKeywords && imagePrompt.qualityKeywords.length > 0) {
      parts.push(imagePrompt.qualityKeywords.join(', '));
    }
    
    return parts.join(', ');
  }

  private getAspectRatioDimensions(aspectRatio: string): [number, number] {
    const ratioMap: Record<string, [number, number]> = {
      '1:1': [1024, 1024],
      '9:16': [576, 1024],
      '16:9': [1024, 576],
      '4:3': [1024, 768],
      '3:4': [768, 1024]
    };
    
    return ratioMap[aspectRatio] || [1024, 1024];
  }

  private mapQualityToOpenAI(quality: string): 'standard' | 'hd' {
    return quality === 'high' ? 'hd' : 'standard';
  }
}
