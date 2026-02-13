// Типы для жанров проектов (совместимо с бекендом)
export type ProjectGenre =
  | 'rpg'
  | 'adventure'
  | 'visual_novel'
  | 'interactive_fiction'
  | 'dating_sim'
  | 'detective'
  | 'horror'
  | 'fantasy'
  | 'sci_fi'
  | 'historical'
  | 'comedy'
  | 'drama'
  | 'thriller'
  | 'romance'
  | 'educational';

// Типы для форматов проектов (совместимо с бекендом)
export type ProjectFormat =
  | 'visual_novel'
  | 'interactive_fiction'
  | 'dialogue_system'
  | 'quest'
  | 'branching_story'
  | 'adventure'
  | 'text_adventure'
  | 'chat_fiction'
  | 'rpg_dialogue'
  | 'cutscene_script'
  | 'game_tutorial'
  | 'character_backstory'
  | 'worldbuilding'
  | 'interactive_lesson'
  | 'training_scenario'
  | 'case_study'
  | 'simulation_script'
  | 'assessment_quest';

// Типы для статуса проекта (совместимо с бекендом)
export type ProjectStatus = 'concept' | 'pre_production' | 'production' | 'post_production' | 'testing' | 'release_ready' | 'released';

// Максимальная длина текстовых полей
export const MAX_TEXT_FIELD_LENGTH = 5000;

// Основной интерфейс информации о проекте (совместимо с бекендом)
export interface ProjectInfo {
  id: string;
  projectId: string;

  // Основная информация
  logline: string | null;
  synopsis: string | null;

  // Категоризация
  genres: string[]; // ProjectGenre[] хранится как string[] в БД
  formats: string[]; // ProjectFormat[] хранится как string[] в БД
  status: string; // ProjectStatus хранится как string в БД

  // Мир и сеттинг
  setting: string | null;
  targetAudience: string | null;
  mainThemes: string | null;
  message: string | null;
  references: string | null;
  uniqueFeatures: string | null;
  atmosphere: string | null;
  visualStyle: string | null;
  constraints: string | null;

  // Мета-информация
  createdAt: Date;
  updatedAt: Date;
}

// DTO для создания/обновления информации о проекте
export interface CreateProjectInfoDto {
  logline?: string;
  synopsis?: string;
  genres?: ProjectGenre[];
  formats?: ProjectFormat[];
  status?: ProjectStatus;
  setting?: string;
  targetAudience?: string;
  mainThemes?: string;
  message?: string;
  references?: string;
  uniqueFeatures?: string;
  atmosphere?: string;
  visualStyle?: string;
  constraints?: string;
}

export type UpdateProjectInfoDto = Partial<CreateProjectInfoDto>;

// Ответ API
export interface ProjectInfoResponse {
  success: boolean;
  data: ProjectInfo;
  message?: string;
}

// Константы для выбора значений (совместимо с бекендом)
export const PROJECT_GENRES: ProjectGenre[] = [
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
];

export const PROJECT_FORMATS: ProjectFormat[] = [
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
];

export const PROJECT_STATUSES: ProjectStatus[] = ['concept', 'pre_production', 'production', 'post_production', 'testing', 'release_ready', 'released'];

// Маппинг для отображения человекочитаемых названий
export const GENRE_LABELS: Record<ProjectGenre, string> = {
  rpg: 'RPG (Ролевая игра)',
  adventure: 'Adventure (Приключенческая)',
  visual_novel: 'Visual Novel (Визуальная новелла)',
  interactive_fiction: 'Interactive Fiction (Интерактивная литература)',
  dating_sim: 'Dating Sim (Симулятор свиданий)',
  detective: 'Detective (Детектив)',
  horror: 'Horror (Хоррор)',
  fantasy: 'Fantasy (Фэнтези)',
  sci_fi: 'Sci-Fi (Научная фантастика)',
  historical: 'Historical (Историческая)',
  comedy: 'Comedy (Комедия)',
  drama: 'Drama (Драма)',
  thriller: 'Thriller (Триллер)',
  romance: 'Romance (Романтика)',
  educational: 'Educational (Образовательная)'
};

export const FORMAT_LABELS: Record<ProjectFormat, string> = {
  visual_novel: 'Visual Novel (Визуальная новелла)',
  interactive_fiction: 'Interactive Fiction (Интерактивная литература)',
  dialogue_system: 'Dialogue System (Система диалогов)',
  quest: 'Quest (Квест)',
  branching_story: 'Branching Story (Ветвящаяся история)',
  adventure: 'Adventure (Приключение)',
  text_adventure: 'Text Adventure (Текстовое приключение)',
  chat_fiction: 'Chat Fiction (Чат-история)',
  rpg_dialogue: 'RPG Dialogue (RPG диалоги)',
  cutscene_script: 'Cutscene Script (Сценарий катсцен)',
  game_tutorial: 'Game Tutorial (Игровой туториал)',
  character_backstory: 'Character Backstory (Предыстория персонажа)',
  worldbuilding: 'Worldbuilding (Построение мира)',
  interactive_lesson: 'Interactive Lesson (Интерактивный урок)',
  training_scenario: 'Training Scenario (Обучающий сценарий)',
  case_study: 'Case Study (Кейс-стади)',
  simulation_script: 'Simulation Script (Сценарий симуляции)',
  assessment_quest: 'Assessment Quest (Оценочный квест)'
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  concept: 'Концепция',
  pre_production: 'Подготовка к производству',
  production: 'Производство',
  post_production: 'Постпродакшн',
  testing: 'Тестирование',
  release_ready: 'Готов к релизу',
  released: 'Выпущен'
};

// Функция для создания пустой информации о проекте
export function createEmptyProjectInfo(projectName: string = ''): CreateProjectInfoDto {
  return {
    logline: '',
    synopsis: '',
    genres: [],
    formats: [],
    status: 'concept',
    setting: '',
    targetAudience: '',
    mainThemes: '',
    message: '',
    references: '',
    uniqueFeatures: '',
    atmosphere: '',
    constraints: ''
  };
}
