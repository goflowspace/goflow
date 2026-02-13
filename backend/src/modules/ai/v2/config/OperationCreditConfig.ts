// backend/src/modules/ai/v2/config/OperationCreditConfig.ts
import { QualityLevel } from "../shared/types";

// Это наш "прейскурант" для пользователей
// Стоимость операций в ВНУТРЕННИХ КРЕДИТАХ
export const OperationCreditConfig: Record<string, Record<QualityLevel, number>> = {
    'default': {
        [QualityLevel.FAST]: 2,
        [QualityLevel.STANDARD]: 2,
        [QualityLevel.EXPERT]: 5,
    },
    
    // Bible Generation Operations
    'atmosphere-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 4,
        [QualityLevel.EXPERT]: 8,
    },
    'constraints-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 4,
    },
    'format-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 4,
    },
    'genre-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 4,
    },
    'logline-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 6,
    },
    'message-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 2,
        [QualityLevel.EXPERT]: 7,
    },
    'references-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 5,
        [QualityLevel.EXPERT]: 6,
    },
    'setting-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 7,
    },
    'synopsis-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 10,
    },
    'target-audience-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 6,
    },
    'theme-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 7,
    },
    'unique-features-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 4,
        [QualityLevel.EXPERT]: 6,
    },
    'visual-style-generation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 4,
        [QualityLevel.EXPERT]: 8,
    },

    // Language Detection Operations
    'language-detection-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 3,
    },

    'field-generation-placeholder': {
        [QualityLevel.FAST]: 2,
        [QualityLevel.STANDARD]: 2,
        [QualityLevel.EXPERT]: 2,
    },
    
    // Entity Operations V2
    'project-context-analysis-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 2,
    },
    'entity-type-detection-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 5,
        [QualityLevel.EXPERT]: 5,
    },
    'entity-field-generation-v2': {
        [QualityLevel.FAST]: 2,
        [QualityLevel.STANDARD]: 6,
        [QualityLevel.EXPERT]: 12,
    },
    'entity-creation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 1,
    },

    // Image Generation Operations
    'entity-context-analysis-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 8,
        [QualityLevel.EXPERT]: 5,
    },
    'image-prompt-generation-v2': {
        [QualityLevel.FAST]: 2,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 8,
    },
    'entity-image-generation-v2': {
        [QualityLevel.FAST]: 39,
        [QualityLevel.STANDARD]: 39,
        [QualityLevel.EXPERT]: 39,
    },

    // Narrative Operations V2
    'narrative-style-analysis-v2': {
        [QualityLevel.FAST]: 10,
        [QualityLevel.STANDARD]: 10,
        [QualityLevel.EXPERT]: 5,
    },
    'project-context-enrichment-v2': {
        [QualityLevel.FAST]: 8,
        [QualityLevel.STANDARD]: 8,
        [QualityLevel.EXPERT]: 4,
    },
    'narrative-text-generation-v2': {
        [QualityLevel.FAST]: 3,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 10,
    },
    'content-safety-validation-v2': {
        [QualityLevel.FAST]: 2,
        [QualityLevel.STANDARD]: 2,
        [QualityLevel.EXPERT]: 2,
    },

    // Next Node Generation Operations V2
    'next-node-context-analysis-v2': {
        [QualityLevel.FAST]: 3,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 4,
    },
    'next-node-project-enrichment-v2': {
        [QualityLevel.FAST]: 8,
        [QualityLevel.STANDARD]: 8,
        [QualityLevel.EXPERT]: 6,
    },
    'next-node-generation-v2': {
        [QualityLevel.FAST]: 3,
        [QualityLevel.STANDARD]: 3,
        [QualityLevel.EXPERT]: 10,
    },
    'next-node-entity-suggestion-v2': {
        [QualityLevel.FAST]: 6,
        [QualityLevel.STANDARD]: 6,
        [QualityLevel.EXPERT]: 5,
    },

    // Validation Operations
    'entity-fields-validation': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 1,
    },

    // Database Operations (non-AI, minimal cost)
    'project-data-fetch': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 1,
    },

    // Utility Operations
    'bible-compression': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 1,
    },

    // Translation Operations
    'node-translation-v2': {
        [QualityLevel.FAST]: 1,
        [QualityLevel.STANDARD]: 1,
        [QualityLevel.EXPERT]: 4,
    },
};

// Определяем стоимость одного кредита в USD для расчета маржинальности
export const USD_PER_CREDIT = 0.02; // 1 кредит = 2 цента

