import { BaseOperation } from '../../base/base-operation';
import { 
  AIOperationCategory, 
  ComplexityLevel, 
  ExecutionContext, 
  ValidationResult 
} from '../../interfaces/operation.interface';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { env } from '../../../../../config/env';
import fs from 'fs';
import path from 'path';

interface ImageGenerationInput {
  prompt: string;
  width?: number;
  height?: number;
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
  safetyFilterLevel?: 'minimal' | 'standard' | 'strict';
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all';
  provider?: 'gemini' | 'openai'; // Новый параметр для выбора провайдера
  quality?: 'low' | 'medium' | 'high' | 'auto'; // Для OpenAI 
}

interface ImageGenerationOutput {
  imageBase64: string;
  imageUrl?: string | null;
  prompt: string;
  revisedPrompt?: string;
  safetyRatings?: any[];
  metadata: {
    model: string;
    width: number;
    height: number;
    aspectRatio?: string;
    generatedAt: string;
  };
}

/**
 * Операция генерации изображения по текстовому промпту с использованием Gemini 2.5 Flash Image
 * Следует принципам SOLID и DRY архитектуры
 */
export class ImageGenerationOperation extends BaseOperation {
  private genAI: GoogleGenAI;
  private openai: OpenAI;
  
  constructor() {
    super(
      'image_generation',
      'AI Image Generation',
      '1.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.HEAVY,
      {
        requiredCapabilities: ['image_generation'],
        maxTokens: 10000, 
        timeout: 60000  // 1 минута
      }
    );
    
    this.genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  protected validateInput(input: ImageGenerationInput, _context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
      return { isValid: false, errors };
    }

    // Валидация промпта
    if (!input.prompt || typeof input.prompt !== 'string') {
      errors.push('Prompt must be a non-empty string');
    }

    if (input.prompt && input.prompt.length < 3) {
      errors.push('Prompt must be at least 3 characters long');
    }

    if (input.prompt && input.prompt.length > (this.requirements.maxTokens ?? 3000)) {
      errors.push(`Prompt is too long (max ${this.requirements.maxTokens ?? 3000} characters)`);
    }

    // Валидация размеров изображения
    if (input.width && (input.width < 64 || input.width > 2048)) {
      errors.push('Width must be between 64 and 2048 pixels');
    }

    if (input.height && (input.height < 64 || input.height > 2048)) {
      errors.push('Height must be between 64 and 2048 pixels');
    }

    // Валидация соотношения сторон
    if (input.aspectRatio && 
        !['1:1', '9:16', '16:9', '4:3', '3:4'].includes(input.aspectRatio)) {
      errors.push('Invalid aspect ratio. Must be one of: 1:1, 9:16, 16:9, 4:3, 3:4');
    }

    // Валидация уровня безопасности
    if (input.safetyFilterLevel && 
        !['minimal', 'standard', 'strict'].includes(input.safetyFilterLevel)) {
      errors.push('Invalid safety filter level. Must be one of: minimal, standard, strict');
    }

    // Валидация генерации персон
    if (input.personGeneration && 
        !['dont_allow', 'allow_adult', 'allow_all'].includes(input.personGeneration)) {
      errors.push('Invalid person generation setting. Must be one of: dont_allow, allow_adult, allow_all');
    }

    // Валидация провайдера
    if (input.provider && !['gemini', 'openai'].includes(input.provider)) {
      errors.push('Invalid provider. Must be one of: gemini, openai');
    }

    // Валидация качества для OpenAI
    if (input.quality && !['low', 'medium', 'high', 'auto'].includes(input.quality)) {
      errors.push('Invalid quality setting. Must be one of: low, medium, high, auto');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected async executeOperation(
    input: ImageGenerationInput,
    _context: ExecutionContext
  ): Promise<{ data: any; tokensUsed?: number; model?: string }> {
    const provider = input.provider || 'gemini'; // По умолчанию используем Gemini
    
    console.log(`🖼️ =========== ${provider.toUpperCase()} IMAGE GENERATION REQUEST ===========`);
    console.log('🎯 Prompt:', input.prompt);
    console.log('⚙️ Input parameters:', JSON.stringify(input, null, 2));

    if (provider === 'openai') {
      return this.generateWithOpenAI(input, _context);
    } else {
      return this.generateWithGemini(input, _context);
    }
  }

  private async generateWithGemini(
    input: ImageGenerationInput,
    _context: ExecutionContext
  ): Promise<{ data: any; tokensUsed?: number; model?: string }> {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    try {
      console.log('🎨 Generating image with Gemini 2.5 Flash Image...');
      console.log('==========================================');

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: [input.prompt]
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No images were generated');
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts) {
        throw new Error('No content parts found in response');
      }

      // Найдем часть с изображением
      const imagePart = candidate.content.parts.find(part => part.inlineData);
      if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        throw new Error('No image data found in response');
      }

      const imageBase64 = imagePart.inlineData.data;

      let width = input.width || 1024;
      let height = input.height || 1024;

      if (input.aspectRatio && !input.width && !input.height) {
        switch (input.aspectRatio) {
          case '1:1':
            width = height = 1024;
            break;
          case '16:9':
            width = 1152;
            height = 896;
            break;
          case '9:16':
            width = 896;
            height = 1152;
            break;
          case '4:3':
            width = 1152;
            height = 896;
            break;
          case '3:4':
            width = 896;
            height = 1152;
            break;
        }
      }

      const output: ImageGenerationOutput = {
        imageBase64,
        prompt: input.prompt,
        revisedPrompt: input.prompt,
        safetyRatings: undefined,
        metadata: {
          model: 'gemini-2.5-flash-image-preview',
          width,
          height,
          aspectRatio: input.aspectRatio,
          generatedAt: new Date().toISOString()
        }
      };

      return {
        data: output,
        tokensUsed: this.estimateTokensUsed(input.prompt),
        model: 'gemini-2.5-flash-image-preview'
      };

    } catch (error) {
      console.error('Error generating image with Gemini 2.5 Flash Image:', error);
      
      if (error instanceof Error) {
        // Обрабатываем специфичные ошибки Gemini API
        if (error.message.includes('Bad Request') || error.message.includes('Invalid JSON payload')) {
          throw new Error('Invalid request parameters. Please check your input data.');
        }
        
        if (error.message.includes('safety') || error.message.includes('blocked')) {
          throw new Error('Image generation blocked by safety filters. Please modify your prompt.');
        }
        
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error('API quota exceeded. Please try again later.');
        }
        
        if (error.message.includes('authentication') || error.message.includes('key')) {
          throw new Error('Authentication failed. Please check your GEMINI_API_KEY.');
        }
        
        throw error;
      }
      
      throw new Error('Unknown error occurred during image generation');
    }
  }

  private async generateWithOpenAI(
    input: ImageGenerationInput,
    _context: ExecutionContext
  ): Promise<{ data: any; tokensUsed?: number; model?: string }> {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables');
    }

    try {
      // Определяем размер изображения на основе aspectRatio
      let size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
      let width = input.width || 1024;
      let height = input.height || 1024;

      if (input.aspectRatio && !input.width && !input.height) {
        switch (input.aspectRatio) {
          case '1:1':
            size = "1024x1024";
            width = height = 1024;
            break;
          case '16:9':
          case '4:3':
            size = "1792x1024";
            width = 1792;
            height = 1024;
            break;
          case '9:16':
          case '3:4':
            size = "1024x1792";
            width = 1024;
            height = 1792;
            break;
        }
      }

      const inputQuality = input.quality || 'standard';
      const model = 'gpt-image-1';
      
      const quality = inputQuality || 'low';

      console.log(`🎨 Generating with OpenAI ${model}, size: ${size}, quality: ${quality} (from ${inputQuality})`);

      const response = await this.openai.images.generate({
        model,
        prompt: input.prompt,
        n: 1,
        size,
        quality
        // Убираем response_format так как gpt-image-1 его не поддерживает
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No images were generated by OpenAI');
      }

      const generatedImage = response.data[0];
      console.log('🔍 OpenAI response structure:', JSON.stringify(generatedImage, null, 2));
      
      // Проверяем разные возможные поля в ответе
      let imageData = null;
      let imageUrl = null;
      
      if (generatedImage.url) {
        imageUrl = generatedImage.url;
        console.log('✅ Found image URL:', imageUrl);
      } else if (generatedImage.b64_json) {
        imageData = generatedImage.b64_json;
        console.log('✅ Found base64 data directly');
      } else {
        console.error('❌ No image data found in response:', Object.keys(generatedImage));
        throw new Error('No image data found in OpenAI response. Available fields: ' + Object.keys(generatedImage).join(', '));
      }

      let imageBase64: string;
      
      if (imageUrl) {
        // Загружаем изображение по URL и конвертируем в base64
        console.log('📥 Fetching image from URL...');
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch generated image from URL');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        imageBase64 = Buffer.from(imageBuffer).toString('base64');
        console.log('✅ Image converted to base64, length:', imageBase64.length);
      } else if (imageData) {
        // Используем base64 данные напрямую
        imageBase64 = imageData;
        console.log('✅ Using direct base64 data, length:', imageBase64.length);
      } else {
        throw new Error('No image data available');
      }

      const output: ImageGenerationOutput = {
        imageBase64: imageBase64,
        imageUrl: imageUrl,
        prompt: input.prompt,
        revisedPrompt: generatedImage.revised_prompt || input.prompt,
        safetyRatings: undefined,
        metadata: {
          model: `${model}-${quality}`,
          width,
          height,
          aspectRatio: input.aspectRatio,
          generatedAt: new Date().toISOString()
        }
      };

      return {
        data: output,
        tokensUsed: this.estimateTokensUsed(input.prompt),
        model: `${model}-${quality}`
      };

    } catch (error) {
      console.error('Error generating image with OpenAI DALL-E:', error);
      
      if (error instanceof Error) {
        // Обрабатываем специфичные ошибки OpenAI API
        if (error.message.includes('content_policy_violation')) {
          throw new Error('Image generation blocked by OpenAI content policy. Please modify your prompt.');
        }
        
        if (error.message.includes('billing_not_active') || error.message.includes('insufficient_quota')) {
          throw new Error('OpenAI API quota exceeded or billing not active. Please check your OpenAI account.');
        }
        
        if (error.message.includes('invalid_api_key') || error.message.includes('authentication')) {
          throw new Error('Authentication failed. Please check your OPENAI_API_KEY.');
        }
        
        throw error;
      }
      
      throw new Error('Unknown error occurred during OpenAI image generation');
    }
  }

  estimateCost(input: ImageGenerationInput, _context: ExecutionContext): number {
    const provider = input.provider || 'gemini';
    
    if (provider === 'openai') {
      // OpenAI DALL-E 3 цены: standard $0.040, HD $0.080 за изображение
      const quality = input.quality || 'low';
      return quality === 'low' ? 0.04 : 0.08;
    } else {
      // Gemini 2.5 Flash Image цена: $30 per 1 million tokens, 1290 tokens per image
      return 0.0387; // (30 * 1290) / 1000000
    }
  }

  private estimateTokensUsed(prompt: string): number {
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Сохраняет сгенерированное изображение в файл
   * @param imageBase64 - Base64 данные изображения
   * @param filename - Имя файла для сохранения
   * @param outputDir - Директория для сохранения (по умолчанию: ./generated-images)
   */
  static async saveImageToFile(
    imageBase64: string, 
    filename: string, 
    outputDir: string = './generated-images'
  ): Promise<string> {
    // Создаем директорию если она не существует
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Добавляем расширение если его нет
    if (!filename.includes('.')) {
      filename += '.png';
    }

    const filePath = path.join(outputDir, filename);
    
    // Конвертируем base64 в буфер и сохраняем
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(filePath, imageBuffer);
    
    return filePath;
  }

  // ===== ПЕРЕОПРЕДЕЛЕННЫЕ МЕТОДЫ =====

  /**
   * Используем прямой вызов AI вместо generateSuggestions (хотя эта операция не использует AI провайдер)
   */
  protected getProviderCallMethod(): 'generateSuggestions' | 'callAIWithMetadata' {
    return 'callAIWithMetadata';
  }
}