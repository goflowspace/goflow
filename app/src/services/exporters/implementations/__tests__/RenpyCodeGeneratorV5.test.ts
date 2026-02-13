import {ChoiceNode, Condition, ConditionGroup, ConditionType, Link, NarrativeNode, Node} from '@types-folder/nodes';
import {Variable, VariableOperation, VariableType} from '@types-folder/variables';

import {ExportFormat, ExportableStory} from '../../interfaces/exportInterfaces';
import {RenpyCodeGeneratorV5} from '../RenpyCodeGeneratorV5';

// Helper function to create a minimal valid story
const createStory = (nodes: Node[], edges: Link[], variables: Variable[] = [], startNodeId = 'node1'): ExportableStory => ({
  title: 'Test Story',
  nodes,
  edges,
  variables,
  startNodeId,
  metadata: {
    originalLayers: [],
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }
});

describe('RenpyCodeGeneratorV5', () => {
  let generator: RenpyCodeGeneratorV5;

  beforeEach(() => {
    generator = new RenpyCodeGeneratorV5();
  });

  const defaultConfig = {
    format: ExportFormat.RENPY,
    includeComments: false,
    minifyOutput: false,
    generateReadme: false,
    indentSize: 4
  };

  test('should generate code for a simple linear story', () => {
    const nodes: Node[] = [{id: 'node1', type: 'narrative', data: {text: 'Hello'}} as NarrativeNode, {id: 'node2', type: 'narrative', data: {text: 'World'}} as NarrativeNode];
    const edges: Link[] = [{id: 'edge1', startNodeId: 'node1', endNodeId: 'node2', conditions: [], type: 'link'}];
    const story = createStory(nodes, edges);

    const code = generator.generateCode(story, defaultConfig);

    const actualLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Find the order of the narrative lines
    const helloIndex = actualLines.findIndex((line) => line === '"Hello"');
    const worldIndex = actualLines.findIndex((line) => line === '"World"');

    expect(helloIndex).toBeGreaterThan(-1);
    expect(worldIndex).toBeGreaterThan(-1);
    expect(worldIndex).toBeGreaterThan(helloIndex);
    expect(actualLines[0]).toBe('label start:');
    expect(actualLines[actualLines.length - 1]).toContain('return');
  });

  test('should generate a menu for a narrative node leading to choices', () => {
    const nodes: Node[] = [
      {id: 'node1', type: 'narrative', data: {text: 'Make a choice:'}} as NarrativeNode,
      {id: 'choice1', type: 'choice', data: {text: 'Option 1'}} as ChoiceNode,
      {id: 'choice2', type: 'choice', data: {text: 'Option 2'}} as ChoiceNode,
      {id: 'node2', type: 'narrative', data: {text: 'You chose 1'}} as NarrativeNode,
      {id: 'node3', type: 'narrative', data: {text: 'You chose 2'}} as NarrativeNode
    ];
    const edges: Link[] = [
      {id: 'e1', startNodeId: 'node1', endNodeId: 'choice1', conditions: [], type: 'link'},
      {id: 'e2', startNodeId: 'node1', endNodeId: 'choice2', conditions: [], type: 'link'},
      {id: 'e3', startNodeId: 'choice1', endNodeId: 'node2', conditions: [], type: 'link'},
      {id: 'e4', startNodeId: 'choice2', endNodeId: 'node3', conditions: [], type: 'link'}
    ];
    const story = createStory(nodes, edges);

    const code = generator
      .generateCode(story, defaultConfig)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    expect(code).toContain('menu:');
    expect(code).toContain('"Option 1":');
    expect(code).toContain('"Option 2":');
    // Check for jumps to labels without asserting the exact label name
    expect(code.some((line) => line.startsWith('jump') && line.includes('you_chose_1'))).toBeTruthy();
    expect(code.some((line) => line.startsWith('jump') && line.includes('you_chose_2'))).toBeTruthy();
    // Check that labels are generated
    expect(code.some((line) => line.startsWith('label') && line.includes('you_chose_1'))).toBeTruthy();
    expect(code.some((line) => line.startsWith('label') && line.includes('you_chose_2'))).toBeTruthy();
  });

  test('should handle conditional transitions', () => {
    const variables: Variable[] = [{id: 'var1', name: 'myVar', type: 'integer' as VariableType, value: 0}];
    const nodes: Node[] = [
      {id: 'node1', type: 'narrative', data: {text: 'Start'}} as NarrativeNode,
      {id: 'node2', type: 'narrative', data: {text: 'Path A'}} as NarrativeNode,
      {id: 'node3', type: 'narrative', data: {text: 'Path B'}} as NarrativeNode
    ];
    const conditions: ConditionGroup[] = [
      {
        id: 'cg1',
        operator: 'AND',
        conditions: [
          {
            type: ConditionType.VARIABLE_COMPARISON,
            varId: 'var1',
            operator: 'eq',
            value: 1,
            valType: 'custom'
          } as Condition
        ]
      }
    ];
    const edges: Link[] = [
      {id: 'e1', startNodeId: 'node1', endNodeId: 'node2', conditions, type: 'link'},
      {id: 'e2', startNodeId: 'node1', endNodeId: 'node3', conditions: [], type: 'link'}
    ];
    const story = createStory(nodes, edges, variables);

    const code = generator.generateCode(story, defaultConfig);
    const codeLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    expect(codeLines).toContain('default var_myVar = 0');
    expect(codeLines).toContain('if var_myVar == 1:');
    expect(codeLines.some((line) => line.startsWith('jump') && line.includes('path_a'))).toBeTruthy();
    expect(codeLines).toContain('else:');
    expect(codeLines.some((line) => line.startsWith('jump') && line.includes('path_b'))).toBeTruthy();
  });

  test('should generate labels for nodes with multiple incoming edges (loops)', () => {
    const nodes: Node[] = [
      {id: 'node1', type: 'narrative', data: {text: 'Start'}} as NarrativeNode,
      {id: 'node2', type: 'narrative', data: {text: 'Middle'}} as NarrativeNode,
      {id: 'node3', type: 'narrative', data: {text: 'End'}} as NarrativeNode
    ];
    const edges: Link[] = [
      {id: 'e1', startNodeId: 'node1', endNodeId: 'node2', conditions: [], type: 'link'},
      {id: 'e2', startNodeId: 'node2', endNodeId: 'node3', conditions: [], type: 'link'},
      {id: 'e3', startNodeId: 'node3', endNodeId: 'node2', conditions: [], type: 'link'} // Loop back
    ];
    const story = createStory(nodes, edges);

    const code = generator.generateCode(story, defaultConfig);
    const codeLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    expect(codeLines.some((line) => line.startsWith('label') && line.includes('middle'))).toBeTruthy();
    expect(codeLines).toContain('"Middle"');
    expect(codeLines.some((line) => line.startsWith('jump') && line.includes('end'))).toBeTruthy();

    // Check that there is a jump to the middle label
    const middleLabelLine = codeLines.find((line) => line.startsWith('label') && line.includes('middle'));
    expect(middleLabelLine).toBeDefined();
    const middleLabelName = middleLabelLine!.split(' ')[1].replace(':', '');

    expect(codeLines).toContain(`jump ${middleLabelName}`);
  });

  test('should correctly handle variable operations', () => {
    const variables: Variable[] = [{id: 'var1', name: 'score', type: 'integer' as VariableType, value: 0}];
    const operations: VariableOperation[] = [{id: 'op1', nodeId: 'node1', variableId: 'var1', operationType: 'addition', target: {type: 'custom', value: 10}, enabled: true, order: 0}];
    const nodes: Node[] = [{id: 'node1', type: 'narrative', data: {text: 'Start'}, operations} as NarrativeNode];
    const story = createStory(nodes, [], variables);

    const code = generator.generateCode(story, defaultConfig);
    const codeLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    expect(codeLines).toContain('default var_score = 0');
    expect(codeLines).toContain('$ var_score += 10');
  });

  test('should correctly handle variable operations with other variables', () => {
    const variables: Variable[] = [
      {id: 'var1', name: 'Дробь_1', type: 'float' as VariableType, value: 45.12},
      {id: 'var2', name: 'Дробь_2', type: 'float' as VariableType, value: 10.5}
    ];
    const operations: VariableOperation[] = [
      {id: 'op1', nodeId: 'node1', variableId: 'var2', operationType: 'subtract', target: {type: 'variable', value: '', variableId: 'var1'}, enabled: true, order: 0}
    ];
    const nodes: Node[] = [{id: 'node1', type: 'narrative', data: {text: 'Start'}, operations} as NarrativeNode];
    const story = createStory(nodes, [], variables);

    const code = generator.generateCode(story, defaultConfig);
    const codeLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    expect(codeLines).toContain('default var_Дробь_1 = 45.12');
    expect(codeLines).toContain('default var_Дробь_2 = 10.5');
    expect(codeLines).toContain('$ var_Дробь_2 -= var_Дробь_1');
  });

  test('should validate story and return errors for unsupported node types', () => {
    const nodes = [{id: 'startNode', type: 'narrative', data: {text: 'start'}} as NarrativeNode, {id: 'unsupportedNode', type: 'unsupported'} as any];
    const story = createStory(nodes, [], [], 'startNode');

    const errors = generator.validateForFormat(story);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('неподдерживаемые типы узлов');
  });

  test('should generate warnings for unused variables', () => {
    const variables: Variable[] = [{id: 'var1', name: 'unused', type: 'string', value: 'a'}];
    const nodes: Node[] = [{id: 'node1', type: 'narrative', data: {text: 'Hello'}} as NarrativeNode];
    const story = createStory(nodes, [], variables);

    const warnings = generator.getFormatWarnings(story);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('неиспользуемых переменных');
    expect(warnings[0]).toContain('unused');
  });

  describe('layer endpoints handling', () => {
    test('должен генерировать метки для концовок слоев, на которые есть ссылки', () => {
      const nodes: Node[] = [
        {
          id: 'narrative-1',
          type: 'narrative',
          data: {
            title: 'Start',
            text: 'Начало истории'
          }
        } as NarrativeNode,
        {
          id: 'layer-ending-1',
          type: 'narrative',
          data: {
            title: 'Концовка A',
            text: 'Это концовка слоя A',
            layerInfo: {
              layerId: 'layer-a',
              layerName: 'Layer A',
              isLayerEndpoint: true,
              endpointType: 'ending'
            }
          }
        } as any,
        {
          id: 'narrative-final',
          type: 'narrative',
          data: {
            title: 'Final',
            text: 'Финальный узел'
          }
        } as NarrativeNode
      ];

      const edges: Link[] = [
        {
          id: 'edge-1',
          startNodeId: 'narrative-1',
          endNodeId: 'layer-ending-1',
          conditions: [],
          type: 'link'
        },
        {
          id: 'edge-2',
          startNodeId: 'layer-ending-1',
          endNodeId: 'narrative-final',
          conditions: [],
          type: 'link'
        }
      ];

      const story = createStory(nodes, edges, [], 'narrative-1');
      const result = generator.generateCode(story, defaultConfig);

      // Проверяем, что в результате нет ошибок валидации
      expect(result).not.toContain('# ВНИМАНИЕ: Обнаружены ошибки валидации меток');
      expect(result).not.toContain('# - Ссылка на несуществующую метку');

      // Проверяем, что метка для концовки слоя была создана
      const expectedLabelPattern = /label\s+[\w_]+:[\s\S]*?"Это концовка слоя A"/;
      expect(result).toMatch(expectedLabelPattern);

      // Проверяем, что есть jump к метке концовки слоя
      const jumpPattern = /jump\s+[\w_]+/;
      expect(result).toMatch(jumpPattern);
    });

    test('должен правильно обрабатывать концовки слоев без исходящих связей', () => {
      const nodes: Node[] = [
        {
          id: 'narrative-1',
          type: 'narrative',
          data: {
            title: 'Start',
            text: 'Начало истории'
          }
        } as NarrativeNode,
        {
          id: 'layer-ending-final',
          type: 'narrative',
          data: {
            title: 'Финальная концовка',
            text: 'Это концовка слоя, которая заканчивает сюжет',
            layerInfo: {
              layerId: 'layer-a',
              layerName: 'Layer A',
              isLayerEndpoint: true,
              endpointType: 'ending'
            }
          }
        } as any
      ];

      const edges: Link[] = [
        {
          id: 'edge-1',
          startNodeId: 'narrative-1',
          endNodeId: 'layer-ending-final',
          conditions: [],
          type: 'link'
        }
      ];

      const story = createStory(nodes, edges, [], 'narrative-1');
      const result = generator.generateCode(story, defaultConfig);

      // Проверяем, что в результате нет ошибок валидации
      expect(result).not.toContain('# ВНИМАНИЕ: Обнаружены ошибки валидации меток');
      expect(result).not.toContain('# - Ссылка на несуществующую метку');

      // Проверяем, что метка для финальной концовки создана и заканчивается return
      const finalLabelPattern = /label\s+[\w_]+:[\s\S]*?"Это концовка слоя, которая заканчивает сюжет"[\s\S]*?return/;
      expect(result).toMatch(finalLabelPattern);
    });
  });
});
