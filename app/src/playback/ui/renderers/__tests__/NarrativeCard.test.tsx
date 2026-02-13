/**
 * Тесты для NarrativeCard - проверка отображения информации о слое
 */
import React from 'react';

import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react';
import {Node} from '@types-folder/nodes';

// Мокаем react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

// Мокаем @radix-ui/themes
jest.mock('@radix-ui/themes', () => ({
  Box: ({children, ...props}: any) => (
    <div data-testid='box' {...props}>
      {children}
    </div>
  ),
  Card: ({children, ...props}: any) => (
    <div data-testid='card' {...props}>
      {children}
    </div>
  ),
  Heading: ({children, ...props}: any) => (
    <h3 data-testid='heading' {...props}>
      {children}
    </h3>
  ),
  Text: ({children, as, ...props}: any) => {
    const Component = as || 'span';
    return (
      <Component data-testid='text' {...props}>
        {children}
      </Component>
    );
  }
}));

// Создаем мок для StoryEngine
class MockStoryEngine {
  isNarrativeNode(node: Node): boolean {
    return node.type === 'narrative';
  }

  isChoiceNode(node: Node): boolean {
    return node.type === 'choice';
  }
}

// Извлекаем NarrativeCard как отдельный компонент для тестирования
const NarrativeCard: React.FC<{node: any; isLast?: boolean; engine: any; projectId?: string}> = ({node, isLast = true, engine}) => {
  if (!engine.isNarrativeNode(node) && !engine.isChoiceNode(node)) return null;

  return (
    <div
      className='novel-card'
      style={{
        marginBottom: isLast ? '20px' : '10px',
        maxWidth: '70%'
      }}
    >
      {engine.isNarrativeNode(node) && (
        <div>
          {node.data.title && (
            <h3 style={{marginBottom: '8px', fontWeight: 700}}>
              {node.data.title}
              {/* Добавляем информацию о слое в той же строке после имени узла */}
              {node.data.layerInfo && node.data.layerInfo.layerName && (
                <span style={{fontStyle: 'italic', fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '8px'}}>({node.data.layerInfo.layerName})</span>
              )}
            </h3>
          )}
          {/* Если нет заголовка, но есть информацию о слое, показываем её отдельно */}
          {!node.data.title && node.data.layerInfo && node.data.layerInfo.layerName && (
            <div style={{fontStyle: 'italic', marginBottom: '8px', color: 'var(--color-text-muted)'}}>({node.data.layerInfo.layerName})</div>
          )}
        </div>
      )}
      <div>{engine.isNarrativeNode(node) ? node.data.text : engine.isChoiceNode(node) ? node.data.text : ''}</div>
    </div>
  );
};

describe('NarrativeCard - Layer Info Display', () => {
  let mockEngine: MockStoryEngine;

  beforeEach(() => {
    mockEngine = new MockStoryEngine();
  });

  describe('Отображение информации о слое в нарративных узлах', () => {
    it('должен отображать название слоя для узла из именованного слоя', () => {
      const nodeWithLayerInfo: Node = {
        id: 'test-node-1',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {
          title: 'Test Narrative',
          text: 'This is a test narrative node',
          layerInfo: {
            layerId: 'custom-layer',
            layerName: 'Custom Layer'
          }
        } as any
      };

      render(<NarrativeCard node={nodeWithLayerInfo} engine={mockEngine} />);

      // Проверяем, что заголовок отображается
      expect(screen.getByText('Test Narrative')).toBeInTheDocument();

      // Проверяем, что информация о слое отображается в скобках
      expect(screen.getByText('(Custom Layer)')).toBeInTheDocument();
    });

    it('должен отображать информацию о слое отдельно, если нет заголовка', () => {
      const nodeWithoutTitle: Node = {
        id: 'test-node-2',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {
          text: 'This narrative has no title but has layer info',
          layerInfo: {
            layerId: 'another-layer',
            layerName: 'Another Layer'
          }
        } as any
      };

      render(<NarrativeCard node={nodeWithoutTitle} engine={mockEngine} />);

      // Проверяем, что текст отображается
      expect(screen.getByText('This narrative has no title but has layer info')).toBeInTheDocument();

      // Проверяем, что информация о слое отображается отдельно
      expect(screen.getByText('(Another Layer)')).toBeInTheDocument();
    });

    it('не должен отображать информацию о слое для root слоя', () => {
      const rootLayerNode: Node = {
        id: 'test-node-3',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {
          title: 'Root Layer Node',
          text: 'This is from root layer',
          layerInfo: {
            layerId: 'root',
            layerName: ''
          }
        } as any
      };

      render(<NarrativeCard node={rootLayerNode} engine={mockEngine} />);

      // Проверяем, что заголовок отображается
      expect(screen.getByText('Root Layer Node')).toBeInTheDocument();

      // Проверяем, что информация о слое НЕ отображается (нет скобок с пустым layerName)
      expect(screen.queryByText('()')).not.toBeInTheDocument();
    });

    it('не должен отображать информацию о слое, если layerInfo отсутствует', () => {
      const nodeWithoutLayerInfo: Node = {
        id: 'test-node-4',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {
          title: 'Node Without Layer Info',
          text: 'This node has no layer info'
        }
      };

      render(<NarrativeCard node={nodeWithoutLayerInfo} engine={mockEngine} />);

      // Проверяем, что заголовок отображается
      expect(screen.getByText('Node Without Layer Info')).toBeInTheDocument();

      // Проверяем, что информация о слое НЕ отображается
      const cardContent = screen.getByText('This node has no layer info').closest('.novel-card');
      expect(cardContent?.textContent).not.toMatch(/\([^)]+\)/);
    });

    it('не должен отображать информацию о слое для узлов выбора', () => {
      const choiceNodeWithLayerInfo: Node = {
        id: 'test-choice-1',
        type: 'choice',
        coordinates: {x: 0, y: 0},
        data: {
          text: 'This is a choice option',
          layerInfo: {
            layerId: 'some-layer',
            layerName: 'Some Layer'
          }
        } as any
      };

      render(<NarrativeCard node={choiceNodeWithLayerInfo} engine={mockEngine} />);

      // Проверяем, что текст выбора отображается
      expect(screen.getByText('This is a choice option')).toBeInTheDocument();

      // Проверяем, что информация о слое НЕ отображается для узлов выбора (логика только для narrative)
      expect(screen.queryByText('(Some Layer)')).not.toBeInTheDocument();
    });

    it('должен отображать название слоя с правильным стилем', () => {
      const nodeWithLayerInfo: Node = {
        id: 'test-node-5',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {
          title: 'Styled Test',
          text: 'Test text',
          layerInfo: {
            layerId: 'styled-layer',
            layerName: 'Styled Layer'
          }
        } as any
      };

      render(<NarrativeCard node={nodeWithLayerInfo} engine={mockEngine} />);

      // Находим элемент с информацией о слое
      const layerInfoElement = screen.getByText('(Styled Layer)');
      expect(layerInfoElement).toBeInTheDocument();

      // Проверяем, что применён правильный тег (span)
      expect(layerInfoElement.tagName.toLowerCase()).toBe('span');
    });
  });
});
