/**
 * Генератор кода для Dialogic (V2)
 * Полностью переработан по аналогии с RenpyCodeGeneratorV5 для повышения надежности и предсказуемости.
 * Включает в себя продвинутый анализ графа, определение меток и обработку сложных сценариев.
 */
import {ChoiceNode, Condition, ConditionGroup, ConditionType, Link, NarrativeNode, Node} from '@types-folder/nodes';
import {OperationTarget, Variable, VariableOperation} from '@types-folder/variables';

import {ExportConfig, ExportFormat, ExportableStory, ICodeGenerator, IFormatValidator} from '../interfaces/exportInterfaces';
import {generateFallbackLabel, generateLabelFromNodeData} from '../utils/labelUtils';

interface NodeContext {
  node: Node;
  incomingEdges: Link[];
  outgoingEdges: Link[];
  requiresLabel: boolean;
}

interface GenerationState {
  processedNodes: Set<string>;
  nodeContexts: Map<string, NodeContext>;
  requiredHappenedVars: Set<string>;
  labelNames: Map<string, string>;
  generatedLabels: Set<string>;
  referencedLabels: Set<string>;
  pendingLabels: Set<string>; // Метки, которые нужно создать
}

export class DialogicCodeGenerator implements ICodeGenerator, IFormatValidator {
  private config: ExportConfig = {
    format: ExportFormat.DIALOGIC,
    includeComments: true,
    minifyOutput: false,
    generateReadme: true,
    indentSize: 4
  };

  private story: ExportableStory = {} as ExportableStory;
  private state: GenerationState = {
    processedNodes: new Set(),
    nodeContexts: new Map(),
    requiredHappenedVars: new Set(),
    labelNames: new Map(),
    generatedLabels: new Set(),
    referencedLabels: new Set(),
    pendingLabels: new Set()
  };
  private indent = '\t'; // Dialogic использует табуляцию

  generateCode(story: ExportableStory, config: ExportConfig): string {
    this.story = story;
    this.config = {...this.config, ...config};
    this.initializeState();

    let lines: string[] = [];

    // Заголовок
    this.generateHeader(lines);

    // Инициализация переменных, необходимых для отслеживания посещений
    this.generateVariableInitializations(lines);

    // Основной код истории
    this.generateMainStoryFlow(lines);

    // Удаляем неиспользуемые метки
    lines = this.removeUnusedLabels(lines);

    // Валидация меток
    const validationErrors = this.validateLabels();
    if (validationErrors.length > 0) {
      const errorLines = ['# WARNING: Обнаружены ошибки валидации меток:', ...validationErrors.map((err) => `# - ${err}`), ''];
      lines = [...errorLines, ...lines];
    }

    return lines.join('\n');
  }

  private initializeState(): void {
    this.state = {
      processedNodes: new Set(),
      nodeContexts: new Map(),
      requiredHappenedVars: new Set(),
      labelNames: new Map(),
      generatedLabels: new Set(),
      referencedLabels: new Set(),
      pendingLabels: new Set()
    };

    this.analyzeGraph();
    this.determineRequiredLabels();
    this.collectRequiredHappenedVars();
    this.generateLabelNames();
  }

  private analyzeGraph(): void {
    this.story.nodes.forEach((node) => {
      const incomingEdges = this.story.edges.filter((edge) => edge.endNodeId === node.id);
      const outgoingEdges = this.story.edges.filter((edge) => edge.startNodeId === node.id);
      const requiresLabel = node.id === this.story.startNodeId; // Стартовый узел не требует метки в Dialogic

      this.state.nodeContexts.set(node.id, {
        node,
        incomingEdges,
        outgoingEdges,
        requiresLabel
      });
    });
  }

  private determineRequiredLabels(): void {
    const nodesInCycles = this.findNodesInCycles();

    this.state.nodeContexts.forEach((context, nodeId) => {
      // Узел в цикле всегда требует метку
      if (nodesInCycles.has(nodeId)) {
        context.requiresLabel = true;
        return;
      }

      // Множественные входящие связи
      if (context.incomingEdges.length > 1) {
        context.requiresLabel = true;
        return;
      }

      // Условные переходы
      if (context.incomingEdges.some((edge) => edge.conditions && edge.conditions.length > 0)) {
        context.requiresLabel = true;
        return;
      }

      // Является целью из узла с множественными исходящими связями
      context.incomingEdges.forEach((edge) => {
        const sourceContext = this.state.nodeContexts.get(edge.startNodeId);
        if (sourceContext && sourceContext.outgoingEdges.length > 1) {
          context.requiresLabel = true;
        }
      });

      // Является прямой целью из choice узла (для которых не генерируется общий таргет)
      const isIncomingFromChoice = context.incomingEdges.some((edge) => {
        const sourceNode = this.story.nodes.find((n) => n.id === edge.startNodeId);
        return sourceNode && sourceNode.type === 'choice';
      });

      if (isIncomingFromChoice) {
        context.requiresLabel = true;
      }
    });
  }

  private findNodesInCycles(): Set<string> {
    const nodesInCycles = new Set<string>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        const cycleStartIndex = path.indexOf(nodeId);
        for (let i = cycleStartIndex; i < path.length; i++) {
          nodesInCycles.add(path[i]);
        }
        nodesInCycles.add(nodeId);
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const context = this.state.nodeContexts.get(nodeId);
      if (context) {
        for (const edge of context.outgoingEdges) {
          hasCycle(edge.endNodeId, [...path]);
        }
      }

      recursionStack.delete(nodeId);
    };

    this.state.nodeContexts.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        hasCycle(nodeId, []);
      }
    });

    return nodesInCycles;
  }

  private collectRequiredHappenedVars(): void {
    this.story.edges.forEach((edge) => {
      edge.conditions?.forEach((group) => {
        group.conditions?.forEach((condition) => {
          if ((condition.type === ConditionType.NODE_HAPPENED || condition.type === ConditionType.NODE_NOT_HAPPENED) && condition.nodeId) {
            this.state.requiredHappenedVars.add(this.getHappenedVarName(condition.nodeId));
          }
        });
      });
    });
  }

  private generateLabelNames(): void {
    this.state.nodeContexts.forEach((context, nodeId) => {
      if (context.requiresLabel) {
        const labelName = this.createLabelName(context.node);
        this.state.labelNames.set(nodeId, labelName);
      }
    });
  }

  private createLabelName(node: Node): string {
    if (node.type === 'narrative') {
      const narrativeNode = node as NarrativeNode;
      return generateLabelFromNodeData(narrativeNode.data.title, narrativeNode.data.text, node.id) || generateFallbackLabel(node.id);
    }
    return generateFallbackLabel(node.id);
  }

  private generateHeader(lines: string[]): void {
    if (this.config.includeComments) {
      lines.push(`# Generated from Go Flow on ${new Date().toISOString()}`);
      lines.push(`# Story: ${this.story.title}`);
      lines.push('');
    }
  }

  private generateVariableInitializations(lines: string[]): void {
    if (this.state.requiredHappenedVars.size > 0) {
      if (this.config.includeComments) {
        lines.push('# Initialization of node visit tracking variables.');
        lines.push('# These variables must be created in the Dialogic editor.');
      }
      this.state.requiredHappenedVars.forEach((varName) => {
        lines.push(`set {${varName}} = false`);
      });
      lines.push('');
    }
  }

  private generateMainStoryFlow(lines: string[]): void {
    const startContext = this.state.nodeContexts.get(this.story.startNodeId);
    if (startContext) {
      this.generateNodeFlow(startContext, lines, '');
    }

    while (this.state.pendingLabels.size > 0) {
      const pendingArray = Array.from(this.state.pendingLabels);
      this.state.pendingLabels.clear();

      pendingArray.forEach((nodeId) => {
        const context = this.state.nodeContexts.get(nodeId);
        if (context && !this.state.processedNodes.has(nodeId)) {
          const labelName = this.state.labelNames.get(nodeId);
          if (labelName && !this.state.generatedLabels.has(labelName)) {
            lines.push('');
            lines.push(`label ${labelName}`);
            this.state.generatedLabels.add(labelName);
            this.generateNodeFlow(context, lines, '');
          }
        }
      });
    }

    this.state.nodeContexts.forEach((context, nodeId) => {
      if (context.requiresLabel && !this.state.processedNodes.has(nodeId)) {
        const labelName = this.state.labelNames.get(nodeId);
        if (labelName && !this.state.generatedLabels.has(labelName)) {
          lines.push('');
          lines.push(`label ${labelName}`);
          this.state.generatedLabels.add(labelName);
          this.generateNodeFlow(context, lines, '');
        }
      }
    });
  }

  private generateNodeFlow(context: NodeContext, lines: string[], indent: string): void {
    const nodeId = context.node.id;

    if (this.state.processedNodes.has(nodeId)) {
      if (context.requiresLabel || this.state.labelNames.has(nodeId)) {
        let labelName = this.state.labelNames.get(nodeId);
        if (!labelName && context.requiresLabel) {
          labelName = this.createLabelName(context.node);
          this.state.labelNames.set(nodeId, labelName);
          this.state.pendingLabels.add(nodeId);
        }
        if (labelName) {
          lines.push(`${indent}jump ${labelName}`);
          this.state.referencedLabels.add(labelName);
        }
      }
      return;
    }

    this.state.processedNodes.add(nodeId);
    this.generateNodeContent(context.node, lines, indent);

    if (context.outgoingEdges.length === 0) {
      lines.push(`${indent}[end_timeline]`);
    } else if (this.isMenuSituation(context)) {
      this.generateMenu(context, lines, indent);
    } else if (context.outgoingEdges.length === 1) {
      this.generateSingleTransition(context.outgoingEdges[0], lines, indent);
    } else {
      this.generateConditionalTransitions(context.outgoingEdges, lines, indent);
    }
  }

  private isMenuSituation(context: NodeContext): boolean {
    return (
      context.node.type === 'narrative' &&
      context.outgoingEdges.length > 0 &&
      context.outgoingEdges.every((edge) => {
        const targetNode = this.story.nodes.find((n) => n.id === edge.endNodeId);
        return targetNode && targetNode.type === 'choice';
      })
    );
  }

  private generateNodeContent(node: Node, lines: string[], indent: string): void {
    if (this.config.includeComments && node.type === 'narrative' && (node as NarrativeNode).data.title) {
      lines.push(`${indent}# ${(node as NarrativeNode).data.title}`);
    }

    if (node.type === 'narrative') {
      const text = this.escapeDialogicText((node as NarrativeNode).data.text);
      if (text) lines.push(`${indent}${text}`);
    }

    this.generateOperations(node as NarrativeNode | ChoiceNode, lines, indent);

    if (this.state.requiredHappenedVars.has(this.getHappenedVarName(node.id))) {
      lines.push(`${indent}set {${this.getHappenedVarName(node.id)}} = true`);
    }
  }

  private generateOperations(node: NarrativeNode | ChoiceNode, lines: string[], indent: string): void {
    if (!node.operations || node.operations.length === 0) return;

    const enabledOperations = node.operations.filter((op) => op.enabled).sort((a, b) => a.order - b.order);

    if (enabledOperations.length > 0 && this.config.includeComments) {
      lines.push(`${indent}# Variable operations`);
    }

    enabledOperations.forEach((operation) => {
      const opCode = this.generateOperationCode(operation);
      if (opCode) {
        lines.push(`${indent}${opCode}`);
      }
    });
  }

  private generateMenu(context: NodeContext, lines: string[], indent: string): void {
    const choiceTargets = context.outgoingEdges.map((edge) => {
      const choiceNode = this.story.nodes.find((n) => n.id === edge.endNodeId);
      if (choiceNode) {
        const choiceContext = this.state.nodeContexts.get(choiceNode.id);
        // Only consider a choice as having a target if it has exactly one unconditional outgoing edge
        if (choiceContext && choiceContext.outgoingEdges.length === 1) {
          return choiceContext.outgoingEdges[0].endNodeId;
        }
      }
      return null;
    });

    const hasCommonTarget = choiceTargets.length > 0 && choiceTargets.length === context.outgoingEdges.length && choiceTargets.every((target) => target !== null && target === choiceTargets[0]);

    const commonTargetId = hasCommonTarget ? choiceTargets[0] : null;

    // Генерируем все выборы используя правильный синтаксис Dialogic для условий
    context.outgoingEdges.forEach((edge) => {
      const choiceNode = this.story.nodes.find((n) => n.id === edge.endNodeId) as ChoiceNode;
      if (!choiceNode || choiceNode.type !== 'choice') return;

      const choiceText = this.escapeDialogicText(choiceNode.data.text);
      const conditionCode = this.generateConditionCode(edge.conditions);

      let choiceLine: string;
      if (conditionCode) {
        // Используем правильный синтаксис Dialogic для условных выборов
        choiceLine = `- ${choiceText} | [if ${conditionCode}] [else="hide"]`;
      } else {
        choiceLine = `- ${choiceText}`;
      }

      const choiceIndent = indent + this.indent;
      lines.push(`${indent}${choiceLine}`);
      this.generateChoiceContent(choiceNode, lines, choiceIndent, commonTargetId);
    });

    if (commonTargetId) {
      const targetContext = this.state.nodeContexts.get(commonTargetId);
      if (targetContext) {
        this.processTransition(targetContext, lines, indent);
      }
    }
  }

  private generateChoiceContent(choiceNode: ChoiceNode, lines: string[], indent: string, commonTargetId: string | null): void {
    const choiceContext = this.state.nodeContexts.get(choiceNode.id);
    if (!choiceContext) return;

    // Генерируем операции и флаг посещения
    this.generateOperations(choiceNode, lines, indent);
    if (this.state.requiredHappenedVars.has(this.getHappenedVarName(choiceNode.id))) {
      lines.push(`${indent}set {${this.getHappenedVarName(choiceNode.id)}} = true`);
    }

    if (choiceContext.outgoingEdges.length === 0) {
      if (!commonTargetId) lines.push(`${indent}[end_timeline]`);
    } else if (choiceContext.outgoingEdges.length === 1) {
      const edge = choiceContext.outgoingEdges[0];
      if (edge.endNodeId !== commonTargetId) {
        this.generateSingleTransition(edge, lines, indent);
      }
    } else {
      this.generateConditionalTransitions(choiceContext.outgoingEdges, lines, indent);
    }
  }

  private generateSingleTransition(edge: Link, lines: string[], indent: string): void {
    const conditionCode = this.generateConditionCode(edge.conditions);
    const targetContext = this.state.nodeContexts.get(edge.endNodeId);
    if (!targetContext) return;

    if (conditionCode) {
      lines.push(`${indent}if ${conditionCode}:`);
      this.processTransition(targetContext, lines, indent + this.indent);
    } else {
      this.processTransition(targetContext, lines, indent);
    }
  }

  private generateConditionalTransitions(edges: Link[], lines: string[], indent: string): void {
    const edgesWithConditions = edges.filter((e) => e.conditions && e.conditions.length > 0);
    const edgeWithoutCondition = edges.find((e) => !e.conditions || e.conditions.length === 0);

    let isFirst = true;
    const nextIndent = indent + this.indent;

    edgesWithConditions.forEach((edge) => {
      const conditionCode = this.generateConditionCode(edge.conditions);
      if (conditionCode) {
        const keyword = isFirst ? 'if' : 'elif';
        lines.push(`${indent}${keyword} ${conditionCode}:`);
        isFirst = false;
        const targetContext = this.state.nodeContexts.get(edge.endNodeId);
        if (targetContext) this.processTransition(targetContext, lines, nextIndent);
      }
    });

    if (edgeWithoutCondition) {
      if (!isFirst) {
        lines.push(`${indent}else:`);
        const targetContext = this.state.nodeContexts.get(edgeWithoutCondition.endNodeId);
        if (targetContext) this.processTransition(targetContext, lines, nextIndent);
      } else {
        const targetContext = this.state.nodeContexts.get(edgeWithoutCondition.endNodeId);
        if (targetContext) this.processTransition(targetContext, lines, indent);
      }
    }
  }

  private processTransition(targetContext: NodeContext, lines: string[], indent: string): void {
    const nodeId = targetContext.node.id;

    if (this.state.processedNodes.has(nodeId)) {
      let labelName = this.state.labelNames.get(nodeId);
      if (!labelName) {
        labelName = this.createLabelName(targetContext.node);
        this.state.labelNames.set(nodeId, labelName);
        this.state.pendingLabels.add(nodeId);
        targetContext.requiresLabel = true;
      }
      lines.push(`${indent}jump ${labelName}`);
      this.state.referencedLabels.add(labelName);
    } else if (targetContext.requiresLabel || this.state.labelNames.has(nodeId)) {
      const labelName = this.state.labelNames.get(nodeId);
      if (labelName) {
        lines.push(`${indent}jump ${labelName}`);
        this.state.referencedLabels.add(labelName);
        this.state.pendingLabels.add(nodeId);
      } else {
        this.generateNodeFlow(targetContext, lines, indent);
      }
    } else {
      this.generateNodeFlow(targetContext, lines, indent);
    }
  }

  private removeUnusedLabels(lines: string[]): string[] {
    const newLines: string[] = [];
    let skipLinesOfLabel = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('label ')) {
        const labelName = trimmed.split(' ')[1];
        if (!this.state.referencedLabels.has(labelName)) {
          skipLinesOfLabel = true;
          // Удаляем пустую строку перед меткой, если она есть
          if (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
            newLines.pop();
          }
          continue;
        }
      }

      if (skipLinesOfLabel) {
        if (trimmed.startsWith('label ') || i === lines.length - 1) {
          skipLinesOfLabel = false;
          // Пересматриваем текущую строку, если это новая метка
          if (trimmed.startsWith('label ')) {
            i--;
            continue;
          }
        } else {
          continue;
        }
      }

      newLines.push(line);
    }

    return newLines;
  }

  private validateLabels(): string[] {
    const errors: string[] = [];
    this.state.referencedLabels.forEach((label) => {
      if (!this.state.generatedLabels.has(label)) {
        errors.push(`Reference to a non-existent label: ${label}`);
      }
    });
    return errors;
  }

  private generateConditionCode(conditionGroups?: ConditionGroup[]): string {
    if (!conditionGroups || conditionGroups.length === 0) return '';
    const groupCodes = conditionGroups.map((group) => this.generateConditionGroupCode(group)).filter(Boolean);
    return groupCodes.length > 0 ? groupCodes.join(' and ') : '';
  }

  private generateConditionGroupCode(group: ConditionGroup): string {
    const conditionCodes = group.conditions.map((condition) => this.generateSingleConditionCode(condition)).filter(Boolean);
    if (conditionCodes.length === 0) return '';
    if (conditionCodes.length === 1) return conditionCodes[0];
    return `(${conditionCodes.join(` ${group.operator.toLowerCase()} `)})`;
  }

  private generateSingleConditionCode(condition: Condition): string {
    switch (condition.type) {
      case ConditionType.PROBABILITY:
        return `randf() < ${condition.probability || 0}`;
      case ConditionType.VARIABLE_COMPARISON:
        return this.generateVariableComparisonCode(condition);
      case ConditionType.NODE_HAPPENED:
        return condition.nodeId ? `{${this.getHappenedVarName(condition.nodeId)}} == true` : '';
      case ConditionType.NODE_NOT_HAPPENED:
        return condition.nodeId ? `not {${this.getHappenedVarName(condition.nodeId)}}` : '';
      default:
        return '';
    }
  }

  private generateVariableComparisonCode(condition: Condition): string {
    const leftVar = this.story.variables.find((v) => v.id === condition.varId);
    if (!leftVar) return '';

    const leftVarName = this.getVariableName(leftVar);
    let rightSide = '';

    if (condition.valType === 'variable' && condition.comparisonVarId) {
      const rightVar = this.story.variables.find((v) => v.id === condition.comparisonVarId);
      if (rightVar) rightSide = `{${this.getVariableName(rightVar)}}`;
    } else if (condition.valType === 'custom' && condition.value !== undefined) {
      rightSide = this.formatVariableValue(condition.value, leftVar.type);
    }

    if (!rightSide) return '';

    const operators: Record<string, string> = {eq: '==', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<='};
    const operator = operators[condition.operator || ''];
    return operator ? `{${leftVarName}} ${operator} ${rightSide}` : '';
  }

  private generateOperationCode(operation: VariableOperation): string {
    const variable = this.story.variables.find((v) => v.id === operation.variableId);
    if (!variable) return '';

    const varName = this.getVariableName(variable);

    if (operation.operationType === 'invert' && variable.type === 'boolean') {
      return `set {${varName}} = not {${varName}}`;
    }

    if (operation.target) {
      const value = this.formatOperationTargetValue(operation.target, variable.type);
      switch (operation.operationType) {
        case 'override':
          return `set {${varName}} = ${value}`;
        case 'addition':
          return `set {${varName}} += ${value}`;
        case 'subtract':
          return `set {${varName}} -= ${value}`;
        case 'multiply':
          return `set {${varName}} *= ${value}`;
        case 'divide':
          return `set {${varName}} /= ${value}`;
        case 'join':
          return variable.type === 'string' ? `set {${varName}} += ${value}` : '';
      }
    }
    return '';
  }

  private getVariableName(variable: Variable): string {
    const baseName = variable.internalName || variable.name;
    // Dialogic vars can contain spaces, but it's better to clean them.
    return baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private getHappenedVarName(nodeId: string): string {
    const cleanId = nodeId.replace(/[^a-zA-Z0-9_]/g, '_');
    return `${cleanId}_happened`;
  }

  private formatVariableValue(value: any, type: string): string {
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'string':
        return `"${this.escapeDialogicText(String(value))}"`;
      default:
        return String(value);
    }
  }

  /**
   * Форматирует значение для операции, учитывая тип цели (переменная или кастомное значение)
   */
  private formatOperationTargetValue(target: OperationTarget, expectedType: string): string {
    if (target.type === 'variable') {
      // Если цель - переменная, то в target.variableId находится ID переменной
      const targetVariable = this.story.variables.find((v) => v.id === target.variableId);
      if (targetVariable) {
        return `{${this.getVariableName(targetVariable)}}`;
      }
      // Если переменная не найдена, возвращаем как есть (для отладки)
      return String(target.variableId || 'unknown_variable');
    } else {
      // Если цель - кастомное значение, используем обычное форматирование
      return this.formatVariableValue(target.value, expectedType);
    }
  }

  private escapeDialogicText(text: string): string {
    // Для Dialogic не нужно экранировать кавычки и обратные слеши,
    // так как символы экранирования отображаются в игре
    // Экранируем двоеточие и удаляем символы новой строки
    return text.replace(/\n/g, '').replace(/:/g, '\\:');
  }

  // --- Реализация интерфейсов ---

  generateReadme(story: ExportableStory, config: ExportConfig): string {
    const lines: string[] = [];
    const indent = ' '.repeat(config.indentSize || 4);

    lines.push(`# ${story.title} - Экспорт для Godot/Dialogic`);
    lines.push('');
    lines.push('## Введение');
    lines.push('Этот документ содержит инструкции по интеграции экспортированной истории из Go Flow в ваш проект на Godot Engine с использованием плагина Dialogic.');
    lines.push('');
    lines.push('## 1. Установка Godot Engine');
    lines.push('');
    lines.push('1. Скачайте и установите Godot Engine версии 4.3 или новее с официального сайта: [https://godotengine.org/download/](https://godotengine.org/download/)');
    lines.push('2. Создайте новый проект в Godot.');
    lines.push('');
    lines.push('## 2. Установка плагина Dialogic');
    lines.push('');
    lines.push('1. В открытом проекте Godot перейдите во вкладку `AssetLib` (находится по центру вверху окна редактора).');
    lines.push('2. В строке поиска введите `Dialogic` и нажмите Enter.');
    lines.push('3. Найдите плагин "Dialogic" от `coppolaemilio` и нажмите на него.');
    lines.push('4. Нажмите кнопку `Download`.');
    lines.push('5. После скачивания, нажмите `Install`. Убедитесь, что все файлы выбраны для установки, и снова нажмите `Install`.');
    lines.push('6. После установки перейдите в `Project -> Project Settings -> Plugins`.');
    lines.push('7. Найдите плагин `Dialogic` и в правой части окна поставьте галочку `Enable`.');
    lines.push('');
    lines.push('## 3. Импорт истории');
    lines.push('');
    lines.push('### 3.1. Импорт файла сюжета (.dtl)');
    lines.push('');
    lines.push('1. Найдите экспортированный из Go Flow файл с расширением `.dtl`.');
    lines.push('2. Перетащите этот файл в файловую систему Godot (в панель `FileSystem` в левой нижней части редактора).');
    lines.push('3. Откройте Dialogic (иконка плагина появится в верхней части редактора после его активации).');
    lines.push('4. В редакторе Dialogic вы должны увидеть ваш импортированный таймлайн. Вы можете открыть его и проверить содержимое.');
    lines.push('');
    lines.push('### 3.2. Создание переменных');
    lines.push('');
    lines.push('Dialogic требует, чтобы все переменные были объявлены в его редакторе. Вам нужно вручную создать переменные, которые используются в вашей истории.');
    lines.push('');
    lines.push('**Список переменных для создания:**');
    lines.push('');

    const allVariables = new Set<string>();
    story.variables.forEach((v) => allVariables.add(this.getVariableName(v)));
    this.state.requiredHappenedVars.forEach((v) => allVariables.add(v));

    if (story.variables.length > 0) {
      lines.push('**Переменные истории:**');
      story.variables.forEach((variable) => {
        const varName = this.getVariableName(variable);
        const defaultValue = this.formatVariableValue(variable.value, variable.type);
        lines.push(`- **${varName}** (\`${variable.type}\`)`);
        lines.push(`${indent}*Начальное значение:* \`${defaultValue}\``);
        if (variable.description) {
          lines.push(`${indent}*Описание:* ${variable.description}`);
        }
      });
      lines.push('');
    }

    if (this.state.requiredHappenedVars.size > 0) {
      lines.push('**Служебные переменные (для отслеживания посещений):**');
      this.state.requiredHappenedVars.forEach((varName) => {
        lines.push(`- **${varName}** (\`boolean\`)`);
        lines.push(`${indent}*Начальное значение:* \`false\``);
      });
      lines.push('');
    }

    lines.push('**Как создать переменные в Dialogic:**');
    lines.push('');
    lines.push('1. Откройте редактор Dialogic.');
    lines.push('2. Перейдите во вкладку `Glossary & Variables`, а затем в под-вкладку `Variables`.');
    lines.push('3. Нажмите `Add Variable`.');
    lines.push('4. Введите имя переменной в точности так, как оно указано в списке выше.');
    lines.push('5. Выберите тип переменной и установите начальное значение согласно списку.');
    lines.push('6. Повторите для всех переменных.');
    lines.push('');
    lines.push('## 4. Использование в игре');
    lines.push('');
    lines.push('Теперь вы можете использовать импортированный таймлайн в своей игре. Например, чтобы запустить историю из GDScript:');
    lines.push('');
    lines.push('```gdscript');
    lines.push('func _ready():');
    const timelineName =
      story.title
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase() || 'story';
    lines.push(`    var dialog = Dialogic.start("${timelineName}")`);
    lines.push('    add_child(dialog)');
    lines.push('```');
    lines.push('');
    lines.push(`Замените \`${timelineName}\` на имя вашего файла, если вы его меняли.`);
    lines.push('');
    lines.push('## Поддержка');
    lines.push('');
    lines.push('Если у вас возникли проблемы, проверьте:');
    lines.push('- Правильность синтаксиса в `.dtl` файле.');
    lines.push('- Что все переменные созданы в редакторе Dialogic с правильными именами и типами.');
    lines.push('- Совместимость версий Godot и Dialogic.');

    return lines.join('\n');
  }

  getFileExtension(): string {
    return '.dtl';
  }

  getSupportedFormat(): ExportFormat {
    return ExportFormat.DIALOGIC;
  }

  validateForFormat(story: ExportableStory): string[] {
    const errors: string[] = [];
    if (!story.startNodeId) {
      errors.push('Отсутствует стартовый узел истории');
    } else {
      const startNode = story.nodes.find((n) => n.id === story.startNodeId);
      if (!startNode) {
        errors.push('Стартовый узел не найден в списке узлов');
      } else if (startNode.type !== 'narrative') {
        errors.push('Стартовый узел должен быть нарративным узлом');
      }
    }

    // Игнорируем заметки при экспорте - они не блокируют экспорт, но и не экспортируются
    const unsupportedNodes = story.nodes.filter((node) => node.type !== 'narrative' && node.type !== 'choice' && node.type !== 'note');
    if (unsupportedNodes.length > 0) {
      const types = [...new Set(unsupportedNodes.map((n) => n.type))];
      errors.push(`Найдены неподдерживаемые типы узлов: ${types.join(', ')}`);
    }

    const choiceNodes = story.nodes.filter((n) => n.type === 'choice');
    choiceNodes.forEach((node) => {
      const incomingEdges = story.edges.filter((e) => e.endNodeId === node.id);
      if (incomingEdges.length === 0) {
        errors.push(`Узел выбора "${(node as ChoiceNode).data.text}" не имеет входящих связей`);
      }
    });

    return errors;
  }

  getFormatWarnings(story: ExportableStory): string[] {
    const warnings: string[] = [];

    const usedVariableIds = new Set<string>();
    story.edges.forEach((edge) => {
      edge.conditions?.forEach((group) => {
        group.conditions?.forEach((condition) => {
          if (condition.varId) usedVariableIds.add(condition.varId);
          if (condition.comparisonVarId) usedVariableIds.add(condition.comparisonVarId);
        });
      });
    });

    story.nodes.forEach((node) => {
      if ('operations' in node && node.operations) {
        node.operations.forEach((op) => {
          usedVariableIds.add(op.variableId);
          if (op.target?.variableId) {
            usedVariableIds.add(op.target.variableId);
          }
        });
      }
    });

    const unusedVariables = story.variables.filter((v) => !usedVariableIds.has(v.id));
    if (unusedVariables.length > 0) {
      warnings.push(`Найдено ${unusedVariables.length} неиспользуемых переменных: ${unusedVariables.map((v) => v.name).join(', ')}`);
    }

    // В новой структуре все узлы должны быть достижимы, поэтому проверка на недостижимые узлы убрана.

    return warnings;
  }
}
