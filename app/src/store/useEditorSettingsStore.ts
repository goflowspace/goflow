import {create} from 'zustand';

import {trackEditorSettingChanged} from '../services/analytics';

export type EditorTheme = 'auto' | 'light' | 'dark';
export type GridType = 'dots' | 'lines' | 'clean';
export const VALID_GRID_GAPS = [10, 20, 30, 40, 50] as const;
export type GridGap = (typeof VALID_GRID_GAPS)[number];
export type CanvasColor =
  | 'lgray' // Light Gray
  | 'gray' // Gray
  | 'dgray' // Dark Gray
  | 'lyellow' // Light Yellow
  | 'lgreen' // Light Green
  | 'lblue' // Light Blue
  | 'lpink' // Light Pink
  | 'lpurple'; // Light Purple
export type LinkThickness = 'thin' | 'regular' | 'thick';
export type LinkStyle = 'solid' | 'dash';
export type ControlsType = 'auto' | 'mouse' | 'touchpad';
export type ToolsHotkeys = 'num' | 'sym';

export function isValidGridGap(value: number): value is GridGap {
  return VALID_GRID_GAPS.includes(value as any);
}

export interface EditorSettingsState {
  theme: EditorTheme;
  grid: GridType;
  gridGap: GridGap;
  canvasColor: CanvasColor;
  snapToGrid: boolean;
  linkSnapping: boolean;
  linkThickness: LinkThickness;
  linkStyle: LinkStyle;
  controls: ControlsType;
  toolsHotkeys: ToolsHotkeys;
  animateLinksToSelected: boolean;
  focusMode: boolean;
  setTheme: (theme: EditorTheme) => void;
  setGrid: (grid: GridType) => void;
  setGridGap: (gridGap: GridGap) => void;
  setCanvasColor: (color: CanvasColor) => void;
  setSnapToGrid: (value: boolean) => void;
  setLinkSnapping: (value: boolean) => void;
  setLinkThickness: (thickness: LinkThickness) => void;
  setLinkStyle: (style: LinkStyle) => void;
  setControls: (controls: ControlsType) => void;
  setToolsHotkeys: (hotkeys: ToolsHotkeys) => void;
  setAnimateLinksToSelected: (value: boolean) => void;
  setFocusMode: (value: boolean) => void;
  loadFromStorage: () => void;
  saveToStorage: (
    partial: Partial<
      Omit<
        EditorSettingsState,
        | 'setTheme'
        | 'setGrid'
        | 'setGridGap'
        | 'setCanvasColor'
        | 'setSnapToGrid'
        | 'setLinkSnapping'
        | 'setLinkThickness'
        | 'setLinkStyle'
        | 'setControls'
        | 'setToolsHotkeys'
        | 'setAnimateLinksToSelected'
        | 'setFocusMode'
        | 'loadFromStorage'
        | 'saveToStorage'
      >
    >
  ) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'editor_settings';

const defaultSettings = {
  theme: 'auto' as EditorTheme,
  grid: 'dots' as GridType,
  gridGap: 20 as GridGap,
  canvasColor: 'lgray' as CanvasColor,
  snapToGrid: true,
  linkSnapping: true,
  linkThickness: 'thin' as LinkThickness,
  linkStyle: 'solid' as LinkStyle,
  controls: 'auto' as ControlsType,
  toolsHotkeys: 'num' as ToolsHotkeys,
  animateLinksToSelected: false,
  focusMode: false
};

export const useEditorSettingsStore = create<EditorSettingsState>((set, get) => ({
  ...defaultSettings,
  setTheme: (theme) => {
    set({theme});
    get().saveToStorage({theme});
    trackEditorSettingChanged('Theme', {theme});
  },
  setGrid: (grid) => {
    set({grid});
    get().saveToStorage({grid});
    trackEditorSettingChanged('Grid', {grid});
  },
  setGridGap: (gridGap) => {
    if (isValidGridGap(gridGap)) {
      set({gridGap});
      get().saveToStorage({gridGap});
      trackEditorSettingChanged('GridGap', {gridGap});
    } else {
      console.warn(`Invalid gridGap value: ${gridGap}. Using current value.`);
    }
  },
  setCanvasColor: (canvasColor) => {
    set({canvasColor});
    get().saveToStorage({canvasColor});
    trackEditorSettingChanged('CanvasColor', {canvasColor});
  },
  setSnapToGrid: (snapToGrid) => {
    set({snapToGrid});
    get().saveToStorage({snapToGrid});
    trackEditorSettingChanged('SnapToGrid', {snapToGrid});
  },
  setLinkSnapping: (linkSnapping) => {
    set({linkSnapping});
    get().saveToStorage({linkSnapping});
    trackEditorSettingChanged('LinkSnapping', {linkSnapping});
  },
  setLinkThickness: (linkThickness) => {
    set({linkThickness});
    get().saveToStorage({linkThickness});
    trackEditorSettingChanged('LinkThickness', {linkThickness});
  },
  setLinkStyle: (linkStyle) => {
    set({linkStyle});
    get().saveToStorage({linkStyle});
    trackEditorSettingChanged('LinkStyle', {linkStyle});
  },
  setControls: (controls) => {
    set({controls});
    get().saveToStorage({controls});
    trackEditorSettingChanged('Controls', {controls});
  },
  setToolsHotkeys: (toolsHotkeys) => {
    set({toolsHotkeys});
    get().saveToStorage({toolsHotkeys});
    trackEditorSettingChanged('ToolsHotkeys', {toolsHotkeys});
  },
  setAnimateLinksToSelected: (animateLinksToSelected) => {
    set({animateLinksToSelected});
    get().saveToStorage({animateLinksToSelected});
    trackEditorSettingChanged('AnimateLinksToSelected', {animateLinksToSelected});
  },
  setFocusMode: (focusMode) => {
    set({focusMode});
    get().saveToStorage({focusMode});
    trackEditorSettingChanged('FocusMode', {focusMode});
  },
  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({...defaultSettings, ...parsed});
    } catch (e) {
      set({...defaultSettings});
    }
  },
  saveToStorage: (partial) => {
    try {
      const current = {...get()} as Partial<EditorSettingsState>;
      delete current.saveToStorage;
      delete current.loadFromStorage;
      delete current.setTheme;
      delete current.setGrid;
      delete current.setGridGap;
      delete current.setCanvasColor;
      delete current.setSnapToGrid;
      delete current.setLinkSnapping;
      delete current.setLinkThickness;
      delete current.setLinkStyle;
      delete current.setControls;
      delete current.setToolsHotkeys;
      delete current.setAnimateLinksToSelected;
      delete current.setFocusMode;
      const toSave = {...current, ...partial};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Error saving settings to localStorage:', e);
    }
  },
  resetToDefaults: () =>
    set({
      ...defaultSettings
    })
}));

export default useEditorSettingsStore;
