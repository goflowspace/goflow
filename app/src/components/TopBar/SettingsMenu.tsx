import React from 'react';

import {DropdownMenu} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {useEditorSettingsStore} from '@store/useEditorSettingsStore';

import {SettingsRadioGroup} from './SettingsRadioGroup';
import {
  CANVAS_COLOR_OPTIONS,
  CONTROLS_OPTIONS,
  GRID_GAP_OPTIONS,
  GRID_OPTIONS,
  LANGUAGE_OPTIONS,
  LINK_STYLE_OPTIONS,
  LINK_THICKNESS_OPTIONS,
  THEME_OPTIONS,
  TOOLS_HOTKEYS_OPTIONS
} from './settings-options';

interface SettingsMenuProps {
  onChangeLanguage: (lang: string) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({onChangeLanguage}) => {
  const {t, i18n} = useTranslation();
  const editorSettings = useEditorSettingsStore();

  // Обновленные LANGUAGE_OPTIONS для работы с флагом needsTranslation
  const languageOptions = LANGUAGE_OPTIONS.map((option) => ({
    ...option,
    needsTranslation: false
  }));

  return (
    <>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>{t('top_bar.language_menu', 'Language')}</DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <SettingsRadioGroup value={i18n.language} onChange={onChangeLanguage} options={languageOptions} preventClose={false} />
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Separator />

      {/* Сгруппированные настройки редактора */}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>{t('top_bar.editor_section', 'Editor')}</DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          {/* Theme */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.theme_section', 'Editor theme')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsRadioGroup value={editorSettings.theme} onChange={editorSettings.setTheme} options={THEME_OPTIONS} preventClose={true} />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Grid */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.grid_section', 'Grid')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsRadioGroup value={editorSettings.grid} onChange={editorSettings.setGrid} options={GRID_OPTIONS} preventClose={true} />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Grid Gap */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.grid_gap_section', 'Grid spacing')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsRadioGroup
                value={editorSettings.gridGap.toString()}
                onChange={(v) => editorSettings.setGridGap(parseInt(v, 10) as any)}
                options={GRID_GAP_OPTIONS.map((opt) => ({...opt, needsTranslation: false}))}
                preventClose={true}
              />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Background color */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.canvas_color_section', 'Background color')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsRadioGroup value={editorSettings.canvasColor} onChange={editorSettings.setCanvasColor} options={CANVAS_COLOR_OPTIONS} preventClose={true} />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Snap objects */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.canvas_snap_to_grid_button', 'Snap Objects to Grid')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild onSelect={(e) => e.preventDefault()}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input type='checkbox' checked={editorSettings.snapToGrid} onChange={(e) => editorSettings.setSnapToGrid(e.target.checked)} style={{marginRight: 8}} />
                  {t('editor_settings.canvas_snap_to_grid_button', 'Snap Objects to Grid')}
                </label>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Links snapping */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.canvas_link_snapping_button', 'Links Snapping')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild onSelect={(e) => e.preventDefault()}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input type='checkbox' checked={editorSettings.linkSnapping} onChange={(e) => editorSettings.setLinkSnapping(e.target.checked)} style={{marginRight: 8}} />
                  {t('editor_settings.canvas_link_snapping_button', 'Links Snapping')}
                </label>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Links thickness */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.obj_section_link_thickness', 'Links thickness')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsRadioGroup value={editorSettings.linkThickness} onChange={editorSettings.setLinkThickness} options={LINK_THICKNESS_OPTIONS} preventClose={true} />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Links style */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.obj_section_link_style', 'Links style')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsRadioGroup value={editorSettings.linkStyle} onChange={editorSettings.setLinkStyle} options={LINK_STYLE_OPTIONS} preventClose={true} />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Animate links to selected */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.animate_links_to_selected', 'Animate Links to Selected')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild onSelect={(e) => e.preventDefault()}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input type='checkbox' checked={editorSettings.animateLinksToSelected} onChange={(e) => editorSettings.setAnimateLinksToSelected(e.target.checked)} style={{marginRight: 8}} />
                  {t('editor_settings.animate_links_to_selected', 'Animate Links to Selected')}
                </label>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Focus mode */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('editor_settings.focus_mode', 'Focus Mode')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item asChild onSelect={(e) => e.preventDefault()}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input type='checkbox' checked={editorSettings.focusMode} onChange={(e) => editorSettings.setFocusMode(e.target.checked)} style={{marginRight: 8}} />
                  {t('editor_settings.focus_mode', 'Focus Mode')}
                </label>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          {/* Reset to defaults */}
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={() => {
              // Сбрасываем все настройки к значениям по умолчанию
              editorSettings.resetToDefaults();
            }}
            onSelect={(e) => e.preventDefault()}
          >
            {t('editor_settings.reset_to_defaults', 'Reset to defaults')}
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>

      {/* Controls */}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>{t('editor_settings.controls_section', 'Controls')}</DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <SettingsRadioGroup value={editorSettings.controls} onChange={editorSettings.setControls} options={CONTROLS_OPTIONS} preventClose={true} />
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>

      {/* Tools hotkeys */}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>{t('editor_settings.tools_hotkeys_section', 'Tools hotkeys')}</DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <SettingsRadioGroup value={editorSettings.toolsHotkeys} onChange={editorSettings.setToolsHotkeys} options={TOOLS_HOTKEYS_OPTIONS} preventClose={true} />
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    </>
  );
};

export default SettingsMenu;
