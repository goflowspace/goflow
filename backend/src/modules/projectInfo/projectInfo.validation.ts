import { z } from "zod";

// Возможные жанры проекта
const projectGenres = [
  'rpg',
  'adventure',
  'visual_novel',
  'interactive_fiction',
  'dating_sim',
  'detective',
  'horror',
  'fantasy',
  'sci_fi',
  'historical',
  'comedy',
  'drama',
  'thriller',
  'romance',
  'educational'
] as const;

// Возможные форматы проекта
const projectFormats = [
  'visual_novel',
  'interactive_fiction',
  'dialogue_system',
  'quest',
  'branching_story',
  'adventure',
  'text_adventure',
  'chat_fiction',
  'rpg_dialogue',
  'cutscene_script',
  'game_tutorial',
  'character_backstory',
  'worldbuilding',
  'interactive_lesson',
  'training_scenario',
  'case_study',
  'simulation_script',
  'assessment_quest'
] as const;

// Маппинг жанров на человеко-читаемые названия
export const GENRE_DISPLAY_NAMES: Record<typeof projectGenres[number], string> = {
  rpg: 'RPG',
  adventure: 'Adventure',
  visual_novel: 'Visual Novel',
  interactive_fiction: 'Interactive Fiction',
  dating_sim: 'Dating Simulation',
  detective: 'Detective',
  horror: 'Horror',
  fantasy: 'Fantasy',
  sci_fi: 'Science Fiction',
  historical: 'Historical',
  comedy: 'Comedy',
  drama: 'Drama',
  thriller: 'Thriller',
  romance: 'Romance',
  educational: 'Educational'
};

// Маппинг форматов на человеко-читаемые названия  
export const FORMAT_DISPLAY_NAMES: Record<typeof projectFormats[number], string> = {
  visual_novel: 'Visual Novel',
  interactive_fiction: 'Interactive Fiction',
  dialogue_system: 'Dialogue System',
  quest: 'Quest',
  branching_story: 'Branching Story',
  adventure: 'Adventure',
  text_adventure: 'Text Adventure',
  chat_fiction: 'Chat Fiction',
  rpg_dialogue: 'RPG Dialogue',
  cutscene_script: 'Cutscene Script',
  game_tutorial: 'Game Tutorial',
  character_backstory: 'Character Backstory',
  worldbuilding: 'Worldbuilding',
  interactive_lesson: 'Interactive Lesson',
  training_scenario: 'Training Scenario',
  case_study: 'Case Study',
  simulation_script: 'Simulation Script',
  assessment_quest: 'Assessment Quest'
};

// Возможные статусы проекта
const projectInfoStatuses = [
  'concept',
  'pre_production',
  'production',
  'post_production',
  'testing',
  'release_ready',
  'released'
] as const;

// Максимальная длина текстовых полей
const MAX_TEXT_FIELD_LENGTH = 5000;

// Схема для создания информации о проекте
export const createProjectInfoSchema = z.object({
  logline: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Логлайн не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  synopsis: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Синопсис не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  genres: z.array(z.enum(projectGenres, {
    errorMap: () => ({ 
      message: `Жанр должен быть одним из: ${projectGenres.join(', ')}` 
    })
  }))
    .max(10, 'Максимум 10 жанров')
    .optional(),
    
  formats: z.array(z.enum(projectFormats, {
    errorMap: () => ({ 
      message: `Формат должен быть одним из: ${projectFormats.join(', ')}` 
    })
  }))
    .max(10, 'Максимум 10 форматов')
    .optional(),
    
  status: z.enum(projectInfoStatuses, {
    errorMap: () => ({ 
      message: `Статус должен быть одним из: ${projectInfoStatuses.join(', ')}` 
    })
  }).optional(),
  
  setting: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Сеттинг не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
  
  targetAudience: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Целевая аудитория не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  mainThemes: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Основные темы не могут содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  message: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Посыл не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  references: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Референсы не могут содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  uniqueFeatures: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Уникальные особенности не могут содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  atmosphere: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Атмосфера не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  visualStyle: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Визуальный стиль не может содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional(),
    
  constraints: z.string()
    .max(MAX_TEXT_FIELD_LENGTH, `Ограничения не могут содержать более ${MAX_TEXT_FIELD_LENGTH} символов`)
    .optional()
});

// Экспортируем константы для использования в других модулях
export { MAX_TEXT_FIELD_LENGTH, projectGenres, projectFormats };

// Схема для обновления информации о проекте (все поля опциональные)
export const updateProjectInfoSchema = createProjectInfoSchema.partial();

// Схема для параметров маршрута
export const projectIdParamSchema = z.object({
  id: z.string({
    required_error: 'ID проекта обязателен'
  })
    .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID проекта')
}); 