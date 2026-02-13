import React, {useEffect, useState} from 'react';

import {useTranslation} from 'react-i18next';

import {useAIDebugStore} from '@store/useAIDebugStore';

import AILoadingAnimation from '@components/common/AILoadingAnimation';

import {useAICredits, useAISettings} from '../../hooks/useAI';
import type {AISettings, AISuggestionType} from '../../types/ai';

import './AISettingsPanel.scss';

interface AISettingsPanelProps {
  className?: string;
  onClose?: () => void;
}

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({className = '', onClose}) => {
  const {t} = useTranslation();
  const {settings, isLoading, error, updateSettings, setTempSettings, resetSettings, hasUnsavedChanges} = useAISettings();

  const {credits, loadCredits} = useAICredits();
  const {isDebugEnabled, setDebugEnabled} = useAIDebugStore();

  const [localSettings, setLocalSettings] = useState<Partial<AISettings>>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSettingChange = (key: keyof AISettings, value: any) => {
    const newSettings = {...localSettings, [key]: value};
    setLocalSettings(newSettings);
    setTempSettings(newSettings);
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      loadCredits(); // Update credits after saving settings
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    }
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings || {});
  };

  const toggleSuggestionType = (type: AISuggestionType) => {
    const currentTypes = localSettings.activeTypes || [];
    const newTypes = currentTypes.includes(type) ? currentTypes.filter((t) => t !== type) : [...currentTypes, type];

    handleSettingChange('activeTypes', newTypes);
  };

  if (!settings) {
    return (
      <div className={`ai-settings-panel loading ${className}`}>
        <AILoadingAnimation variant='processing' size='medium' text={t('ai_settings.loading_text')} />
      </div>
    );
  }

  return (
    <div className={`ai-settings-panel ${className}`}>
      <div className='settings-header'>
        <h2 className='settings-title'>🤖 {t('ai_settings.title')}</h2>
        {onClose && (
          <button className='close-btn' onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className='error-message'>
          <span className='error-icon'>⚠️</span>
          <span className='error-text'>{error}</span>
        </div>
      )}

      <div className='settings-content'>
        {/* Credits */}
        {credits && (
          <div className='settings-section'>
            <h3 className='section-title'>💰 {t('ai_settings.credits_title')}</h3>
            <div className='credits-info'>
              <div className='credits-balance'>
                <span className='balance-value'>{credits.balance}</span>
                <span className='balance-label'>{t('ai_settings.credits_available')}</span>
              </div>
              <div className='credits-usage'>
                <div className='usage-bar'>
                  <div
                    className='usage-fill'
                    style={{
                      width: `${(credits.usedThisMonth / credits.monthlyLimit) * 100}%`
                    }}
                  />
                </div>
                <span className='usage-text'>
                  {credits.usedThisMonth} / {credits.monthlyLimit} {t('ai_settings.credits_per_month')}
                </span>
              </div>
              <div className='plan-info'>
                {t('ai_settings.credits_plan')} <strong>{credits.plan}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Main settings */}
        <div className='settings-section'>
          <h3 className='section-title'>⚙️ {t('ai_settings.main_settings_title')}</h3>

          <div className='setting-item'>
            <label className='setting-label'>
              <input type='checkbox' checked={localSettings.proactiveMode ?? false} onChange={(e) => handleSettingChange('proactiveMode', e.target.checked)} />
              {t('ai_settings.proactive_mode')}
            </label>
            <p className='setting-description'>{t('ai_settings.proactive_mode_desc')}</p>
          </div>

          <div className='setting-item'>
            <label className='setting-label'>{t('ai_settings.suggestion_delay')}</label>
            <input
              type='range'
              min='1'
              max='10'
              step='1'
              value={localSettings.suggestionDelay ?? 3}
              onChange={(e) => handleSettingChange('suggestionDelay', parseInt(e.target.value))}
              className='range-input'
            />
            <span className='setting-value'>
              {localSettings.suggestionDelay ?? 3} {t('ai_settings.suggestion_delay_unit')}
            </span>
          </div>

          <div className='setting-item'>
            <label className='setting-label'>{t('ai_settings.prediction_radius')}</label>
            <select value={localSettings.predictionRadius ?? 1} onChange={(e) => handleSettingChange('predictionRadius', parseInt(e.target.value) as 1 | 2)} className='select-input'>
              <option value={1}>{t('ai_settings.prediction_radius_fast')}</option>
              <option value={2}>{t('ai_settings.prediction_radius_accurate')}</option>
            </select>
          </div>

          <div className='setting-item'>
            <label className='setting-label'>{t('ai_settings.creativity_level')}</label>
            <input
              type='range'
              min='0'
              max='1'
              step='0.1'
              value={localSettings.creativityLevel ?? 0.7}
              onChange={(e) => handleSettingChange('creativityLevel', parseFloat(e.target.value))}
              className='range-input'
            />
            <span className='setting-value'>{Math.round((localSettings.creativityLevel ?? 0.7) * 100)}%</span>
          </div>
        </div>

        {/* Suggestion types */}
        <div className='settings-section'>
          <h3 className='section-title'>🎯 {t('ai_settings.suggestion_types_title')}</h3>

          <div className='suggestion-types'>
            {[
              {type: 'REPHRASE_NARRATIVE' as AISuggestionType, label: t('ai_settings.suggestion_type_rephrase_narrative'), icon: '✏️'},
              {type: 'REPHRASE_CHOICE' as AISuggestionType, label: t('ai_settings.suggestion_type_rephrase_choice'), icon: '🔄'},
              {type: 'STRUCTURE_ONLY' as AISuggestionType, label: t('ai_settings.suggestion_type_structure'), icon: '🏗️'},
              {type: 'NEXT_NODES' as AISuggestionType, label: t('ai_settings.suggestion_type_next_nodes'), icon: '➡️'}
            ].map(({type, label, icon}) => (
              <div key={type} className='suggestion-type-item'>
                <label className='type-label'>
                  <input type='checkbox' checked={localSettings.activeTypes?.includes(type) ?? false} onChange={() => toggleSuggestionType(type)} />
                  <span className='type-icon'>{icon}</span>
                  <span className='type-text'>{label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* AI Provider */}
        <div className='settings-section'>
          <h3 className='section-title'>🤖 {t('ai_settings.ai_provider_title')}</h3>

          <div className='setting-item'>
            <select value={localSettings.preferredProvider ?? 'OPENAI'} onChange={(e) => handleSettingChange('preferredProvider', e.target.value)} className='select-input'>
              <option value='OPENAI'>OpenAI GPT-4</option>
              <option value='ANTHROPIC'>Anthropic Claude</option>
              <option value='VERTEX'>Google Vertex AI</option>
              <option value='GEMINI'>Google Gemini</option>
            </select>
          </div>
        </div>

        {/* Learning */}
        <div className='settings-section'>
          <h3 className='section-title'>📚 {t('ai_settings.learning_title')}</h3>

          <div className='setting-item'>
            <label className='setting-label'>
              <input type='checkbox' checked={localSettings.learningEnabled ?? true} onChange={(e) => handleSettingChange('learningEnabled', e.target.checked)} />
              {t('ai_settings.learning_enabled')}
            </label>
            <p className='setting-description'>{t('ai_settings.learning_desc')}</p>
          </div>
        </div>

        {/* Debug mode */}
        <div className='settings-section'>
          <h3 className='section-title'>🐛 {t('ai_settings.debug_title')}</h3>

          <div className='setting-item'>
            <label className='setting-label'>
              <input type='checkbox' checked={isDebugEnabled} onChange={(e) => setDebugEnabled(e.target.checked)} />
              {t('ai_settings.debug_enabled')}
            </label>
            <p className='setting-description'>{t('ai_settings.debug_desc')}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className='settings-actions'>
        <button className='btn btn-primary' onClick={handleSave} disabled={isLoading || !hasUnsavedChanges}>
          {isLoading ? `💾 ${t('ai_settings.save_loading')}` : `💾 ${t('ai_settings.save_button')}`}
        </button>

        <button className='btn btn-secondary' onClick={handleReset} disabled={isLoading || !hasUnsavedChanges}>
          🔄 {t('ai_settings.reset_button')}
        </button>

        {hasUnsavedChanges && <span className='unsaved-indicator'>⚠️ {t('ai_settings.unsaved_changes')}</span>}
      </div>
    </div>
  );
};

export default AISettingsPanel;
