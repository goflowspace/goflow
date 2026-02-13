import {CanvasColor} from '@store/useEditorSettingsStore';

// Интерфейс для цветовой схемы
export interface ColorScheme {
  // Цвет фона канваса (для справки)
  canvasBg: string;
  // Цвета сетки
  grid: {
    // Цвет точек сетки
    dots: string;
    // Цвет линий сетки
    lines: string;
  };
  // Цвета связей
  edgeColors: {
    // Обычные связи
    normal: string;
    // Выбранные связи
    selected: string;
    // Временные связи
    temp: string;
  };
  // Цвет тени для узлов
  nodeShadow: string;
}

// Цветовые схемы для разных цветов холста
const colorSchemes: Record<CanvasColor, ColorScheme> = {
  // Светло-серый фон
  lgray: {
    canvasBg: '#f7f3f2',
    grid: {
      dots: 'rgba(0, 0, 0, 0.15)',
      lines: 'rgba(0, 0, 0, 0.05)'
    },
    edgeColors: {
      normal: '#7c7c86',
      selected: '#333333',
      temp: '#5e7ce2'
    },
    nodeShadow: 'rgba(0, 0, 0, 0.12)'
  },

  // Серый фон
  gray: {
    canvasBg: '#d1d1d1',
    grid: {
      dots: 'rgba(60, 60, 60, 0.15)',
      lines: 'rgba(60, 60, 60, 0.05)'
    },
    edgeColors: {
      normal: '#555555',
      selected: '#222222',
      temp: '#4a63c7'
    },
    nodeShadow: 'rgba(0, 0, 0, 0.18)'
  },

  // Тёмно-серый фон
  dgray: {
    canvasBg: '#23272f',
    grid: {
      dots: 'rgba(255, 255, 255, 0.15)',
      lines: 'rgba(255, 255, 255, 0.05)'
    },
    edgeColors: {
      normal: '#a0a0a0',
      selected: '#e0e0e0',
      temp: '#799cf7'
    },
    nodeShadow: 'rgba(0, 0, 0, 0.5)'
  },

  // Светло-жёлтый фон
  lyellow: {
    canvasBg: '#fffbe6',
    grid: {
      dots: 'rgba(196, 168, 0, 0.15)',
      lines: 'rgba(196, 168, 0, 0.05)'
    },
    edgeColors: {
      normal: '#b0a060',
      selected: '#806800',
      temp: '#d09000'
    },
    nodeShadow: 'rgba(173, 158, 56, 0.15)'
  },

  // Светло-зелёный фон
  lgreen: {
    canvasBg: '#e6ffe6',
    grid: {
      dots: 'rgba(0, 120, 0, 0.15)',
      lines: 'rgba(0, 120, 0, 0.05)'
    },
    edgeColors: {
      normal: '#60a070',
      selected: '#006800',
      temp: '#00a060'
    },
    nodeShadow: 'rgba(56, 173, 74, 0.15)'
  },

  // Светло-голубой фон
  lblue: {
    canvasBg: '#e6f0ff',
    grid: {
      dots: 'rgba(0, 80, 196, 0.15)',
      lines: 'rgba(0, 80, 196, 0.05)'
    },
    edgeColors: {
      normal: '#6080b0',
      selected: '#003068',
      temp: '#3070d0'
    },
    nodeShadow: 'rgba(56, 93, 173, 0.15)'
  },

  // Светло-розовый фон
  lpink: {
    canvasBg: '#ffe6f0',
    grid: {
      dots: 'rgba(196, 0, 120, 0.15)',
      lines: 'rgba(196, 0, 120, 0.05)'
    },
    edgeColors: {
      normal: '#b06090',
      selected: '#800040',
      temp: '#d04080'
    },
    nodeShadow: 'rgba(173, 56, 129, 0.15)'
  },

  // Светло-фиолетовый фон
  lpurple: {
    canvasBg: '#f0e6ff',
    grid: {
      dots: 'rgba(120, 0, 196, 0.15)',
      lines: 'rgba(120, 0, 196, 0.05)'
    },
    edgeColors: {
      normal: '#8070b0',
      selected: '#400080',
      temp: '#8040d0'
    },
    nodeShadow: 'rgba(127, 56, 173, 0.15)'
  }
};

/**
 * Получить цветовую схему для выбранного цвета холста
 * @param canvasColor - цвет холста
 * @returns цветовая схема
 */
export const getColorScheme = (canvasColor: CanvasColor): ColorScheme => {
  return colorSchemes[canvasColor] || colorSchemes.lgray;
};

export default colorSchemes;
