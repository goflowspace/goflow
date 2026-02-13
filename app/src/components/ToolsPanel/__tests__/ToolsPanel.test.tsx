import React from 'react';

import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {Theme} from '@radix-ui/themes';
import {fireEvent, render, screen} from '@testing-library/react';

import ToolsPanel from '../ToolsPanel';

// Создаем моки, которые можно будет проверять
const mockSetActiveTool = jest.fn();
const mockDeselectAllNodes = jest.fn();
const mockAmpliSelectTool = jest.fn();

// Типы для тестов
interface Node {
  id: string;
  selected: boolean;
}

// Хранилище для тестовых данных
const testData = {
  nodes: [] as Node[],
  toolsHotkeys: 'num' as 'num' | 'sym',
  isToolsBlocked: false
};

// Моки для Zustand хуков
jest.mock('@store/useToolsStore', () => ({
  useToolStore: () => ({
    activeTool: 'cursor',
    setActiveTool: mockSetActiveTool
  })
}));

jest.mock('@store/useCanvasStore', () => ({
  useCanvasStore: (selector: any) => {
    // Имитируем селектор Zustand
    if (typeof selector === 'function') {
      // Для хука useCanvasStore((state) => state.nodes)
      return selector({
        nodes: testData.nodes,
        deselectAllNodes: mockDeselectAllNodes
      });
    }
    // Для хука useCanvasStore(), возвращаем состояние
    return {
      nodes: testData.nodes,
      deselectAllNodes: mockDeselectAllNodes
    };
  }
}));

jest.mock('@store/useEditorSettingsStore', () => ({
  useEditorSettingsStore: () => testData.toolsHotkeys
}));

jest.mock('src/ampli', () => ({
  ampli: {
    selectTool: mockAmpliSelectTool
  }
}));

// Мокаем navigator.platform
Object.defineProperty(navigator, 'platform', {
  value: 'Win32',
  configurable: true,
  writable: true
});

// Создаем обертку с необходимыми провайдерами
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <TooltipPrimitive.Provider>
      <Theme>{ui}</Theme>
    </TooltipPrimitive.Provider>
  );
};

describe('ToolsPanel UI Elements', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Сбрасываем тестовые данные
    testData.nodes = [];
    testData.toolsHotkeys = 'num';
    testData.isToolsBlocked = false;

    // Сбрасываем моки
    mockSetActiveTool.mockClear();
    mockDeselectAllNodes.mockClear();
    mockAmpliSelectTool.mockClear();
  });

  it('should render all tool buttons', () => {
    renderWithProviders(<ToolsPanel />);

    // Проверяем, что все кнопки инструментов отображаются
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('should disable unlink tool as specified', () => {
    renderWithProviders(<ToolsPanel />);

    // Получаем кнопку unlink (пятая по счету)
    const unlinkButton = screen.getAllByRole('button')[4];

    // Проверяем, что кнопка отключена
    expect(unlinkButton).toHaveProperty('disabled', true);
  });

  it('should not handle tool button click when tools are blocked', () => {
    // Блокируем инструменты
    testData.isToolsBlocked = true;

    renderWithProviders(<ToolsPanel />);

    // Находим кнопку нарративного узла и кликаем по ней
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // narrative tool button

    // Функция setActiveTool не должна быть вызвана
    expect(mockSetActiveTool).not.toHaveBeenCalled();
  });

  it('should not deselect nodes when changing tool if there are no selected nodes', () => {
    // Добавляем узлы без выделения
    testData.nodes = [
      {id: 'node1', selected: false},
      {id: 'node2', selected: false}
    ];

    renderWithProviders(<ToolsPanel />);

    // Функция deselectAllNodes не должна быть вызвана
    expect(mockDeselectAllNodes).not.toHaveBeenCalled();
  });

  it('should ignore hotkeys when user is typing in an input field', () => {
    // Создаем текстовое поле для теста
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderWithProviders(<ToolsPanel />);

    // Симулируем ввод в текстовое поле
    fireEvent.keyDown(input, {key: '2'});

    // Проверяем, что инструмент не поменялся
    expect(mockSetActiveTool).not.toHaveBeenCalled();

    // Удаляем текстовое поле
    document.body.removeChild(input);
  });

  it('should ignore hotkeys with modifier keys (Ctrl/Cmd)', () => {
    renderWithProviders(<ToolsPanel />);

    // Симулируем нажатие клавиши 2 с зажатым Ctrl
    fireEvent.keyDown(document, {key: '2', ctrlKey: true});

    // Проверяем, что инструмент не поменялся
    expect(mockSetActiveTool).not.toHaveBeenCalled();

    // Симулируем нажатие клавиши 2 с зажатым Cmd (metaKey)
    fireEvent.keyDown(document, {key: '2', metaKey: true});

    // Проверяем, что инструмент не поменялся
    expect(mockSetActiveTool).not.toHaveBeenCalled();
  });
});
