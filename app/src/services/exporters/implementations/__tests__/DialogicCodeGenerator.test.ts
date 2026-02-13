import {ChoiceNode, Condition, ConditionGroup, ConditionType, Link, NarrativeNode, Node} from '@types-folder/nodes';
import {Variable, VariableOperation, VariableType} from '@types-folder/variables';

import {ExportFormat, ExportableStory} from '../../interfaces/exportInterfaces';
import {DialogicCodeGenerator} from '../DialogicCodeGenerator';

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

describe('DialogicCodeGenerator', () => {
  let generator: DialogicCodeGenerator;

  beforeEach(() => {
    generator = new DialogicCodeGenerator();
  });

  const defaultConfig = {
    format: ExportFormat.DIALOGIC,
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

    const expected = ['Hello', 'World', '[end_timeline]'].join('\n');

    expect(code.replace(/\s/g, '')).toBe(expected.replace(/\s/g, ''));
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

    expect(code).toContain('Make a choice\\:');
    expect(code).toContain('- Option 1');
    expect(code).toContain('- Option 2');
    expect(code.some((line) => line.startsWith('jump') && line.includes('you_chose_1'))).toBeTruthy();
    expect(code.some((line) => line.startsWith('jump') && line.includes('you_chose_2'))).toBeTruthy();
    expect(code.some((line) => line.startsWith('label') && line.includes('you_chose_1'))).toBeTruthy();
    expect(code.some((line) => line.startsWith('label') && line.includes('you_chose_2'))).toBeTruthy();
  });

  test('should handle conditional transitions', () => {
    const variables: Variable[] = [{id: 'var1', name: 'my_var', type: 'integer' as VariableType, value: 0}];
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

    expect(codeLines).toContain('if {my_var} == 1:');
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
      {id: 'e1', startNodeId: 'node1', endNodeId: 'node2', type: 'link', conditions: []},
      {id: 'e2', startNodeId: 'node2', endNodeId: 'node3', type: 'link', conditions: []},
      {id: 'e3', startNodeId: 'node3', endNodeId: 'node2', type: 'link', conditions: []} // Loop back
    ];
    const story = createStory(nodes, edges);

    const code = generator.generateCode(story, defaultConfig);
    const codeLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    expect(codeLines.some((line) => line.startsWith('label') && line.includes('middle'))).toBeTruthy();
    expect(codeLines).toContain('Middle');
    expect(codeLines.some((line) => line.startsWith('jump') && line.includes('end'))).toBeTruthy();

    const middleLabelLine = codeLines.find((line) => line.startsWith('label') && line.includes('middle'));
    expect(middleLabelLine).toBeDefined();
    const middleLabelName = middleLabelLine!.split(' ')[1];

    expect(codeLines.lastIndexOf(`jump ${middleLabelName}`)).toBeGreaterThan(-1);
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

    expect(codeLines).toContain('set {score} += 10');
  });

  test('should correctly handle variable operations with other variables', () => {
    const variables: Variable[] = [
      {id: 'var1', name: 'value1', type: 'float' as VariableType, value: 45.12},
      {id: 'var2', name: 'value2', type: 'float' as VariableType, value: 10.5}
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

    expect(codeLines).toContain('set {value2} -= {value1}');
  });

  test('should validate story and return errors for unsupported node types', () => {
    const nodes = [{id: 'startNode', type: 'narrative', data: {text: 'start'}} as NarrativeNode, {id: 'unsupportedNode', type: 'unsupported'} as any];
    const story = createStory(nodes, [], [], 'startNode');

    const errors = generator.validateForFormat(story);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('неподдерживаемые типы узлов');
  });

  test('should generate conditional choices correctly', () => {
    const variables: Variable[] = [{id: 'var1', name: 'strength', type: 'string' as VariableType, value: 'Хлипкая'}];
    const nodes: Node[] = [
      {id: 'node1', type: 'narrative', data: {text: 'К тебе в палатку заглянул Тема "Динозавр"'}} as NarrativeNode,
      {id: 'choice1', type: 'choice', data: {text: 'Необходимо укрепить всю конструкцию'}} as ChoiceNode,
      {id: 'choice2', type: 'choice', data: {text: 'Нужно строить баньку'}} as ChoiceNode,
      {id: 'choice3', type: 'choice', data: {text: 'Будем строить баньку с двойным усилием!'}} as ChoiceNode,
      {id: 'node2', type: 'narrative', data: {text: 'Работнички весь день укрепляли конструкцию'}} as NarrativeNode,
      {id: 'node3', type: 'narrative', data: {text: 'Работнички весь день строили баньку'}} as NarrativeNode,
      {id: 'node4', type: 'narrative', data: {text: 'Динозавр весь день подгонял работничков'}} as NarrativeNode
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
            value: 'Хлипкая',
            valType: 'custom'
          } as Condition
        ]
      }
    ];

    const edges: Link[] = [
      {id: 'e1', startNodeId: 'node1', endNodeId: 'choice1', conditions, type: 'link'}, // условный выбор
      {id: 'e2', startNodeId: 'node1', endNodeId: 'choice2', conditions: [], type: 'link'}, // обычный выбор
      {id: 'e3', startNodeId: 'node1', endNodeId: 'choice3', conditions: [], type: 'link'}, // обычный выбор
      {id: 'e4', startNodeId: 'choice1', endNodeId: 'node2', conditions: [], type: 'link'},
      {id: 'e5', startNodeId: 'choice2', endNodeId: 'node3', conditions: [], type: 'link'},
      {id: 'e6', startNodeId: 'choice3', endNodeId: 'node4', conditions: [], type: 'link'}
    ];

    const story = createStory(nodes, edges, variables);

    const code = generator.generateCode(story, defaultConfig);
    const codeLines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Проверяем, что все выборы отображаются в правильном формате
    const conditionalChoice = codeLines.find((line) => line.includes('Необходимо укрепить всю конструкцию') && line.includes('[if') && line.includes('[else="hide"]'));
    expect(conditionalChoice).toBeDefined();
    expect(conditionalChoice).toContain('- Необходимо укрепить всю конструкцию | [if {strength} == "Хлипкая"] [else="hide"]');

    // Проверяем, что обычные выборы генерируются без условий
    expect(codeLines).toContain('- Нужно строить баньку');
    expect(codeLines).toContain('- Будем строить баньку с двойным усилием!');

    // Проверяем, что не создаются отдельные if-else блоки для условных выборов
    const ifBlocks = codeLines.filter((line) => line.startsWith('if ') && line.includes('strength'));
    expect(ifBlocks).toHaveLength(0); // не должно быть отдельных if блоков
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

  test('should handle text with quotes and special characters without escaping', () => {
    // Проверяем, что для Dialogic не экранируются кавычки и спецсимволы
    const textWithQuotes = 'She said "Hello!" and he replied "Hi there!"';
    const textWithApostrophes = "It's a beautiful day, isn't it?";
    const textWithSlashes = 'C:\\Users\\Name\\Documents';

    const nodes: Node[] = [
      {id: 'node1', type: 'narrative', data: {text: textWithQuotes}} as NarrativeNode,
      {id: 'node2', type: 'narrative', data: {text: textWithApostrophes}} as NarrativeNode,
      {id: 'node3', type: 'narrative', data: {text: textWithSlashes}} as NarrativeNode
    ];
    const edges: Link[] = [
      {id: 'e1', startNodeId: 'node1', endNodeId: 'node2', conditions: [], type: 'link'},
      {id: 'e2', startNodeId: 'node2', endNodeId: 'node3', conditions: [], type: 'link'}
    ];
    const story = createStory(nodes, edges);

    const code = generator.generateCode(story, defaultConfig);

    // Проверяем, что текст содержится в коде без экранирования
    expect(code).toContain('She said "Hello!" and he replied "Hi there!"');
    expect(code).toContain("It's a beautiful day, isn't it?");
    expect(code).toContain('C\\:\\Users\\Name\\Documents');

    // Убеждаемся, что нет экранированных символов
    expect(code).not.toContain('\\"');
    expect(code).not.toContain('\\\\');
  });

  test('should handle string variables with quotes without escaping them in variable operations', () => {
    // Проверяем, что операции с переменными не экранируют кавычки
    const variables: Variable[] = [{id: 'var1', name: 'quote_text', type: 'string' as VariableType, value: 'He said "yes"'}];

    const operations: VariableOperation[] = [{id: 'op1', nodeId: 'node1', variableId: 'var1', operationType: 'override', target: {type: 'custom', value: 'She said "no"'}, enabled: true, order: 0}];

    const nodes: Node[] = [{id: 'node1', type: 'narrative', data: {text: 'Setting variable'}, operations} as NarrativeNode];

    const story = createStory(nodes, [], variables, 'node1');
    const code = generator.generateCode(story, defaultConfig);

    // Проверяем, что операция override содержит кавычки без экранирования
    expect(code).toContain('set {quote_text} = "She said "no""');

    // Убеждаемся, что нет экранированных символов
    expect(code).not.toContain('\\"');
    expect(code).not.toContain('\\\\');
  });

  test('should not block export when story contains note nodes', () => {
    // Проверяем, что заметки не блокируют экспорт
    const nodes: Node[] = [
      {id: 'startNode', type: 'narrative', data: {text: 'Start story'}} as NarrativeNode,
      {id: 'noteNode', type: 'note', data: {text: 'This is a note'}} as any, // NoteNode
      {id: 'choiceNode', type: 'choice', data: {text: 'Make a choice'}} as ChoiceNode
    ];

    const story = createStory(nodes, [], [], 'startNode');

    // Валидация не должна возвращать ошибки
    const errors = generator.validateForFormat(story);
    expect(errors).not.toContain(expect.stringContaining('note'));

    // Экспорт должен работать
    expect(() => generator.generateCode(story, defaultConfig)).not.toThrow();
  });
});
