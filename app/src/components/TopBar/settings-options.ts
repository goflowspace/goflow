import {type CanvasColor, type ControlsType, type EditorTheme, type GridType, type LinkStyle, type LinkThickness, type ToolsHotkeys, VALID_GRID_GAPS} from '@store/useEditorSettingsStore';

// Константы для генерации настроек
export const THEME_OPTIONS: {value: EditorTheme; label: string}[] = [
  {value: 'dark', label: 'editor_settings.theme_section_dark'},
  {value: 'light', label: 'editor_settings.theme_section_light'},
  {value: 'auto', label: 'editor_settings.theme_section_auto'}
];

export const GRID_OPTIONS: {value: GridType; label: string}[] = [
  {value: 'dots', label: 'editor_settings.grid_section_dots'},
  {value: 'lines', label: 'editor_settings.grid_section_lines'},
  {value: 'clean', label: 'editor_settings.grid_section_clean'}
];

export const GRID_GAP_OPTIONS = VALID_GRID_GAPS.map((value) => ({
  value: value.toString(),
  label: `${value}px`
}));

export const CANVAS_COLOR_OPTIONS: {value: CanvasColor; label: string; color: string}[] = [
  {value: 'lgray', label: 'editor_settings.canvas_color_section_lgray', color: '#f7f3f2'},
  {value: 'gray', label: 'editor_settings.canvas_color_section_gray', color: '#d1d1d1'},
  {value: 'dgray', label: 'editor_settings.canvas_color_section_dgray', color: '#23272f'},
  {value: 'lyellow', label: 'editor_settings.canvas_color_section_lyellow', color: '#fffbe6'},
  {value: 'lgreen', label: 'editor_settings.canvas_color_section_lgreen', color: '#e6ffe6'},
  {value: 'lblue', label: 'editor_settings.canvas_color_section_lblue', color: '#e6f0ff'},
  {value: 'lpink', label: 'editor_settings.canvas_color_section_lpink', color: '#ffe6f0'},
  {value: 'lpurple', label: 'editor_settings.canvas_color_section_lpurple', color: '#f0e6ff'}
];

export const LINK_THICKNESS_OPTIONS: {value: LinkThickness; label: string}[] = [
  {value: 'thin', label: 'editor_settings.obj_section_link_thickness_thin'},
  {value: 'regular', label: 'editor_settings.obj_section_link_thickness_regular'},
  {value: 'thick', label: 'editor_settings.obj_section_link_thickness_thick'}
];

export const LINK_STYLE_OPTIONS: {value: LinkStyle; label: string}[] = [
  {value: 'solid', label: 'editor_settings.obj_section_link_style_solid'},
  {value: 'dash', label: 'editor_settings.obj_section_link_style_dash'}
];

export const CONTROLS_OPTIONS: {value: ControlsType; label: string}[] = [
  {value: 'mouse', label: 'editor_settings.controls_section_mouse'},
  {value: 'touchpad', label: 'editor_settings.controls_section_touchpad'}
];

export const TOOLS_HOTKEYS_OPTIONS: {value: ToolsHotkeys; label: string}[] = [
  {value: 'num', label: 'editor_settings.tools_hotkeys_section_num'},
  {value: 'sym', label: 'editor_settings.tools_hotkeys_section_sym'}
];

export const LANGUAGE_OPTIONS = [
  {value: 'en', label: 'English'},
  {value: 'ru', label: 'Русский'},
  {value: 'fr', label: 'Français'},
  {value: 'es', label: 'Español'},
  {value: 'pt', label: 'Português'}
];
