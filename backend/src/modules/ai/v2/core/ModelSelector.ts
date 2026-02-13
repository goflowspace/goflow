// backend/src/modules/ai/v2/core/ModelSelector.ts
import { BaseAIOperation, ExecutionContext, ModelConfig } from '../shared/types';

export class ModelSelector {
  static getConfigForOperation(
    operation: BaseAIOperation,
    context: ExecutionContext
  ): ModelConfig {
    const qualityLevel = context.qualityLevel;

    // 1. Get the primary config for the chosen quality level
    const config = operation.aiConfig.modeConfigs[qualityLevel];
    
    if (!config) {
      throw new Error(`No model config found for quality level: ${qualityLevel}`);
    }

    // 2. Check if the user wants to avoid this provider
    const userAvoidsProvider = context.userPreferences?.avoidProviders?.includes(config.provider);

    if (userAvoidsProvider) {
      // 3. Try to get a fallback configuration
      const fallbackConfig = operation.aiConfig.fallbackConfigs?.[qualityLevel];
      
      if (fallbackConfig && fallbackConfig.provider) {
        // 4. Check if the user also avoids the fallback provider
        const userAvoidsFallback = context.userPreferences?.avoidProviders?.includes(fallbackConfig.provider);
        if (!userAvoidsFallback) {
          return fallbackConfig as ModelConfig; // Use fallback if not avoided
        }
      }
    }
    
    // 5. Return the primary config if no valid fallback is found

    return config;
  }
}

