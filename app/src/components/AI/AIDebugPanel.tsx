import React, {useEffect, useState} from 'react';

import {api} from '../../services/api';

import './AIDebugPanel.scss';

interface AIPromptTemplate {
  id: string;
  promptKey: string;
  promptType: 'SYSTEM_PROMPT' | 'USER_PROMPT' | 'PROJECT_BIBLE';
  suggestionType?: string;
  content: string;
  description: string;
  variables: Record<string, any>;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AIDebugSettings {
  debugMode: boolean;
  useCustomPrompts: boolean;
  enablePromptLogging: boolean;
  enablePromptCache: boolean;
  cacheTimeout: number;
}

interface AIDebugPanelProps {
  className?: string;
  onClose?: () => void;
}

const AIDebugPanel: React.FC<AIDebugPanelProps> = ({className = '', onClose}) => {
  const [debugSettings, setDebugSettings] = useState<AIDebugSettings | null>(null);
  const [prompts, setPrompts] = useState<AIPromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPromptTemplate | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<AIPromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'prompts'>('settings');

  useEffect(() => {
    loadDebugSettings();
    loadPrompts();
  }, []);

  const loadDebugSettings = async () => {
    try {
      const data = await api.getAIDebugSettings();

      if (data.success) {
        setDebugSettings(data.data);
      } else {
        setError('Ошибка загрузки настроек');
      }
    } catch (error) {
      console.error('Error loading debug settings:', error);
      setError('Ошибка загрузки настроек');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPrompts = async () => {
    try {
      const data = await api.getAllAIPrompts();

      if (data.success) {
        setPrompts(data.data);
      } else {
        setError('Ошибка загрузки промптов');
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      setError('Ошибка загрузки промптов');
    }
  };

  const updateDebugSettings = async (updates: Partial<AIDebugSettings>) => {
    try {
      const newSettings = {...debugSettings, ...updates};
      const data = await api.updateAIDebugSettings(newSettings);

      if (data.success) {
        setDebugSettings(data.data);
      } else {
        setError('Ошибка обновления настроек');
      }
    } catch (error) {
      console.error('Error updating debug settings:', error);
      setError('Ошибка обновления настроек');
    }
  };

  const clearCache = async () => {
    try {
      const data = await api.clearAIPromptCache();

      if (data.success) {
        console.log('Кеш очищен успешно');
      } else {
        setError('Ошибка очистки кеша');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      setError('Ошибка очистки кеша');
    }
  };

  const handleSavePrompt = async (promptData: Partial<AIPromptTemplate>) => {
    try {
      const isCreating = !selectedPrompt?.id;
      let data;

      if (isCreating) {
        data = await api.createAIPrompt(promptData);
      } else {
        data = await api.updateAIPrompt(selectedPrompt!.promptKey, promptData);
      }

      if (data.success) {
        // Обновляем список промптов
        await loadPrompts();
        setSelectedPrompt(null);
      } else {
        throw new Error(data.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      throw error; // Пробрасываем ошибку для отображения в редакторе
    }
  };

  const groupPromptsByType = (prompts: AIPromptTemplate[]) => {
    return prompts.reduce(
      (groups, prompt) => {
        const key = prompt.promptType;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(prompt);
        return groups;
      },
      {} as Record<string, AIPromptTemplate[]>
    );
  };

  if (isLoading) {
    return (
      <div className={`ai-debug-panel loading ${className}`}>
        <div className='loading-spinner'>
          <div className='spinner'></div>
          <span>Загрузка дебаг панели...</span>
        </div>
      </div>
    );
  }

  if (!debugSettings) {
    return (
      <div className={`ai-debug-panel error ${className}`}>
        <div className='error-message'>
          <span className='error-icon'>⚠️</span>
          <span>Ошибка загрузки настроек дебаг режима</span>
        </div>
      </div>
    );
  }

  const groupedPrompts = groupPromptsByType(prompts);

  return (
    <div className={`ai-debug-panel ${className}`}>
      <div className='debug-header'>
        <h2 className='debug-title'>🐛 Дебаг режим AI промптов</h2>
        {onClose && (
          <button className='close-btn' onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className='error-banner'>
          <span className='error-icon'>⚠️</span>
          <span className='error-text'>{error}</span>
          <button className='error-dismiss' onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <div className='debug-tabs'>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          ⚙️ Настройки
        </button>
        <button className={`tab-btn ${activeTab === 'prompts' ? 'active' : ''}`} onClick={() => setActiveTab('prompts')}>
          📝 Промпты
        </button>
      </div>

      <div className='debug-content'>
        {activeTab === 'settings' && (
          <div className='settings-tab'>
            <div className='settings-section'>
              <h3 className='section-title'>Основные настройки</h3>

              <div className='setting-item'>
                <label className='setting-label'>
                  <input type='checkbox' checked={debugSettings.debugMode} onChange={(e) => updateDebugSettings({debugMode: e.target.checked})} />
                  Включить дебаг режим
                </label>
                <p className='setting-description'>Активирует расширенное логирование и дополнительные возможности отладки</p>
              </div>

              <div className='setting-item'>
                <label className='setting-label'>
                  <input type='checkbox' checked={debugSettings.useCustomPrompts} onChange={(e) => updateDebugSettings({useCustomPrompts: e.target.checked})} />
                  Использовать кастомные промпты из БД
                </label>
                <p className='setting-description'>При включении система будет использовать промпты из базы данных вместо кодовых</p>
              </div>

              <div className='setting-item'>
                <label className='setting-label'>
                  <input type='checkbox' checked={debugSettings.enablePromptLogging} onChange={(e) => updateDebugSettings({enablePromptLogging: e.target.checked})} />
                  Логировать все промпты и ответы
                </label>
                <p className='setting-description'>Записывает все промпты и ответы AI в консоль для анализа</p>
              </div>
            </div>

            <div className='settings-section'>
              <h3 className='section-title'>Кеширование</h3>

              <div className='setting-item'>
                <label className='setting-label'>
                  <input type='checkbox' checked={debugSettings.enablePromptCache} onChange={(e) => updateDebugSettings({enablePromptCache: e.target.checked})} />
                  Включить кеширование промптов
                </label>
                <p className='setting-description'>Кеширует промпты из БД для улучшения производительности</p>
              </div>

              <div className='setting-item'>
                <label className='setting-label'>Время жизни кеша (секунды)</label>
                <input type='number' min='60' max='3600' value={debugSettings.cacheTimeout} onChange={(e) => updateDebugSettings({cacheTimeout: parseInt(e.target.value)})} className='number-input' />
                <p className='setting-description'>Как долго промпты хранятся в кеше (от 60 до 3600 секунд)</p>
              </div>

              <div className='setting-item'>
                <button className='cache-clear-btn' onClick={clearCache}>
                  🗑️ Очистить кеш
                </button>
                <p className='setting-description'>Принудительно очищает весь кеш промптов</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className='prompts-tab'>
            <div className='prompts-header'>
              <h3 className='section-title'>Управление промптами</h3>
              <button className='create-prompt-btn' onClick={() => setSelectedPrompt({} as AIPromptTemplate)}>
                ➕ Создать промпт
              </button>
            </div>

            {Object.entries(groupedPrompts).map(([type, typePrompts]) => (
              <div key={type} className='prompt-group'>
                <h4 className='group-title'>
                  {type === 'SYSTEM_PROMPT' && '🤖 Системные промпты'}
                  {type === 'USER_PROMPT' && '👤 Пользовательские промпты'}
                  {type === 'PROJECT_BIBLE' && '📖 Промпты библии проекта'}
                </h4>

                <div className='prompts-list'>
                  {typePrompts.map((prompt) => (
                    <div key={prompt.id} className='prompt-item'>
                      <div className='prompt-info'>
                        <div className='prompt-key'>{prompt.promptKey}</div>
                        <div className='prompt-meta'>
                          {prompt.suggestionType && <span className='suggestion-type'>{prompt.suggestionType}</span>}
                          <span className='version'>v{prompt.version}</span>
                          <span className='status'>{prompt.isActive ? '🟢 Активен' : '🔴 Неактивен'}</span>
                        </div>
                        <div className='prompt-description'>{prompt.description}</div>
                      </div>

                      <div className='prompt-actions'>
                        <button className='edit-btn' onClick={() => setSelectedPrompt(prompt)} title='Редактировать'>
                          ✏️
                        </button>
                        <button className='view-btn' onClick={() => setPreviewPrompt(prompt)} title='Просмотр'>
                          👁️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <div className='empty-state'>
                <div className='empty-icon'>📝</div>
                <div className='empty-title'>Промпты не найдены</div>
                <div className='empty-description'>Создайте первый кастомный промпт для начала работы</div>
              </div>
            )}
          </div>
        )}
      </div>

      {previewPrompt && (
        <div className='prompt-preview-modal'>
          <div className='prompt-preview-overlay' onClick={() => setPreviewPrompt(null)} />
          <div className='prompt-preview-content'>
            <div className='prompt-preview-header'>
              <h3 className='prompt-preview-title'>👁️ Просмотр промпта: {previewPrompt.promptKey}</h3>
              <button className='prompt-preview-close' onClick={() => setPreviewPrompt(null)} title='Закрыть'>
                ✕
              </button>
            </div>

            <div className='prompt-preview-body'>
              <div className='prompt-meta-info'>
                <div className='meta-item'>
                  <strong>Тип:</strong> {previewPrompt.promptType}
                </div>
                {previewPrompt.suggestionType && (
                  <div className='meta-item'>
                    <strong>Тип предложения:</strong> {previewPrompt.suggestionType}
                  </div>
                )}
                <div className='meta-item'>
                  <strong>Версия:</strong> {previewPrompt.version}
                </div>
                <div className='meta-item'>
                  <strong>Статус:</strong> {previewPrompt.isActive ? '🟢 Активен' : '🔴 Неактивен'}
                </div>
                <div className='meta-item'>
                  <strong>Описание:</strong> {previewPrompt.description}
                </div>
              </div>

              <div className='prompt-content-section'>
                <h4>Содержимое промпта:</h4>
                <pre className='prompt-content'>{previewPrompt.content}</pre>
              </div>

              {Object.keys(previewPrompt.variables || {}).length > 0 && (
                <div className='prompt-variables-section'>
                  <h4>Переменные:</h4>
                  <pre className='prompt-variables'>{JSON.stringify(previewPrompt.variables, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className='prompt-preview-footer'>
              <button
                className='edit-from-preview-btn'
                onClick={() => {
                  setSelectedPrompt(previewPrompt);
                  setPreviewPrompt(null);
                }}
              >
                ✏️ Редактировать
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPrompt && (
        <div className='prompt-editor-placeholder'>
          <h3>Редактор промптов временно недоступен</h3>
          <button onClick={() => setSelectedPrompt(null)}>Закрыть</button>
        </div>
      )}
    </div>
  );
};

export default AIDebugPanel;
