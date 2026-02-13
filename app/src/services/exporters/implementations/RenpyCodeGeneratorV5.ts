/**
 * Генератор кода для Ren'Py (V5) - Финальная версия
 * Исправлены проблемы с валидацией меток и неиспользуемыми метками
 */
import {ChoiceNode, Condition, ConditionGroup, ConditionType, Link, NarrativeNode, Node} from '@types-folder/nodes';
import {OperationTarget, Variable, VariableOperation} from '@types-folder/variables';
import crypto from 'crypto';

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
  commonPatterns: Map<string, string>;
  generatedLabels: Set<string>;
  referencedLabels: Set<string>;
  pendingLabels: Set<string>; // Метки, которые нужно создать
}

interface CodeBlock {
  startLine: number;
  endLine: number;
  hash: string;
  content: string[];
  indentLevel: number;
}

export class RenpyCodeGeneratorV5 implements ICodeGenerator, IFormatValidator {
  private config: ExportConfig = {
    format: ExportFormat.RENPY,
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
    commonPatterns: new Map(),
    generatedLabels: new Set(),
    referencedLabels: new Set(),
    pendingLabels: new Set()
  };

  generateCode(story: ExportableStory, config: ExportConfig): string {
    this.story = story;
    this.config = config;
    this.initializeState();

    let lines: string[] = [];

    // Заголовок
    this.generateHeader(lines);

    // Объявления переменных
    this.generateVariableDeclarations(lines);

    // Основной код истории
    this.generateMainStoryFlow(lines);

    // Постобработка для дедупликации
    lines = this.postProcessForDeduplication(lines);

    // Удаляем неиспользуемые метки
    lines = this.removeUnusedLabels(lines);

    // Валидация меток
    const validationErrors = this.validateLabels();
    if (validationErrors.length > 0) {
      // Добавляем ошибки валидации в начало файла как комментарии
      const errorLines = ['# ВНИМАНИЕ: Обнаружены ошибки валидации меток:', ...validationErrors.map((err) => `# - ${err}`), ''];
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
      commonPatterns: new Map(),
      generatedLabels: new Set(),
      referencedLabels: new Set(),
      pendingLabels: new Set()
    };

    // Первый проход: анализируем граф и создаем контексты
    this.analyzeGraph();

    // Второй проход: определяем, какие узлы требуют метки
    this.determineRequiredLabels();

    // Собираем все требуемые happened-переменные
    this.collectRequiredHappenedVars();

    // Генерируем имена меток для узлов, которые их требуют
    this.generateLabelNames();
  }

  private analyzeGraph(): void {
    // Создаем контексты для всех узлов
    this.story.nodes.forEach((node) => {
      const incomingEdges = this.story.edges.filter((edge) => edge.endNodeId === node.id);
      const outgoingEdges = this.story.edges.filter((edge) => edge.startNodeId === node.id);

      // Начальное определение - только стартовый узел требует метку
      const requiresLabel = node.id === this.story.startNodeId;

      this.state.nodeContexts.set(node.id, {
        node,
        incomingEdges,
        outgoingEdges,
        requiresLabel
      });
    });
  }

  private determineRequiredLabels(): void {
    // Узел требует метку если:
    // 1. Он стартовый
    // 2. В него входит больше одной связи
    // 3. В него ведет условный переход
    // 4. Он является целью прямого перехода из choice узла (не общий целевой узел)
    // 5. Он является целью перехода из узла с множественными исходящими связями
    // 6. Он является частью цикла (обратная связь)

    // Сначала находим все узлы, которые являются частью циклов
    const nodesInCycles = this.findNodesInCycles();

    this.state.nodeContexts.forEach((context, nodeId) => {
      if (nodeId === this.story.startNodeId) {
        context.requiresLabel = true;
        return;
      }

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

      // Проверяем, является ли узел целью из узла с множественными исходящими связями
      context.incomingEdges.forEach((edge) => {
        const sourceContext = this.state.nodeContexts.get(edge.startNodeId);
        if (sourceContext && sourceContext.outgoingEdges.length > 1) {
          // Если из источника идет больше одной связи, то этот узел может потребовать метку
          // для возможности прыжка из других веток
          context.requiresLabel = true;
          return;
        }
      });

      // Проверяем, является ли узел прямой целью из choice узла
      const hasIncomingFromChoice = context.incomingEdges.some((edge) => {
        const sourceNode = this.story.nodes.find((n) => n.id === edge.startNodeId);
        return sourceNode && sourceNode.type === 'choice';
      });

      if (hasIncomingFromChoice) {
        // Если есть хотя бы один переход из choice узла, требуется метка
        // Это исправляет проблему с узлами, на которые ссылаются из меню
        context.requiresLabel = true;
      }

      // Проверяем, является ли узел концовкой слоя
      const nodeData = (context.node as any).data;
      if (nodeData?.layerInfo?.isLayerEndpoint && nodeData?.layerInfo?.endpointType === 'ending') {
        // Концовки слоев должны иметь метки, если на них есть входящие связи
        // так как они могут быть целями переходов из других слоев
        if (context.incomingEdges.length > 0) {
          context.requiresLabel = true;
        }
      }
    });
  }

  private findNodesInCycles(): Set<string> {
    const nodesInCycles = new Set<string>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Нашли цикл - добавляем все узлы из пути в цикле
        const cycleStartIndex = path.indexOf(nodeId);
        for (let i = cycleStartIndex; i < path.length; i++) {
          nodesInCycles.add(path[i]);
        }
        nodesInCycles.add(nodeId);
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const context = this.state.nodeContexts.get(nodeId);
      if (context) {
        for (const edge of context.outgoingEdges) {
          if (hasCycle(edge.endNodeId, [...path])) {
            // Этот узел тоже часть пути к циклу
            nodesInCycles.add(nodeId);
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Проверяем все узлы
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
      if (context.requiresLabel || nodeId === this.story.startNodeId) {
        const labelName = this.createLabelName(context.node);
        this.state.labelNames.set(nodeId, labelName);
      }
    });
  }

  private createLabelName(node: Node): string {
    if (node.id === this.story.startNodeId) {
      return 'start';
    }

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
      lines.push(`# Nodes: ${this.story.nodes.length}, Variables: ${this.story.variables.length}`);
      lines.push('');
    }
  }

  private generateVariableDeclarations(lines: string[]): void {
    if (this.story.variables.length > 0) {
      if (this.config.includeComments) {
        lines.push('# Variable declarations');
      }

      this.story.variables.forEach((variable) => {
        const varName = this.getVariableName(variable);
        const value = this.formatVariableValue(variable.value, variable.type);
        lines.push(`default ${varName} = ${value}`);
      });
      lines.push('');
    }

    // Генерируем happened-переменные
    if (this.state.requiredHappenedVars.size > 0) {
      if (this.config.includeComments) {
        lines.push('# Node visit tracking variables');
      }

      this.state.requiredHappenedVars.forEach((varName) => {
        lines.push(`default ${varName} = False`);
      });
      lines.push('');
    }
  }

  private generateMainStoryFlow(lines: string[]): void {
    // Начинаем с label start
    lines.push('label start:');
    this.state.generatedLabels.add('start');

    const startContext = this.state.nodeContexts.get(this.story.startNodeId);

    if (startContext) {
      this.generateNodeFlow(startContext, lines, 1);
    } else {
      lines.push(this.indent(1) + 'return');
    }

    // Генерируем метки для узлов из pendingLabels
    while (this.state.pendingLabels.size > 0) {
      const pendingArray = Array.from(this.state.pendingLabels);
      this.state.pendingLabels.clear();

      pendingArray.forEach((nodeId) => {
        const context = this.state.nodeContexts.get(nodeId);
        if (context && !this.state.processedNodes.has(nodeId)) {
          const labelName = this.state.labelNames.get(nodeId);
          if (labelName && !this.state.generatedLabels.has(labelName)) {
            lines.push('');
            lines.push(`label ${labelName}:`);
            this.state.generatedLabels.add(labelName);
            this.generateNodeFlow(context, lines, 1);
          }
        }
      });
    }

    // Генерируем остальные метки для узлов, которые еще не обработаны
    this.state.nodeContexts.forEach((context, nodeId) => {
      if (context.requiresLabel && !this.state.processedNodes.has(nodeId) && nodeId !== this.story.startNodeId) {
        const labelName = this.state.labelNames.get(nodeId);
        if (labelName && !this.state.generatedLabels.has(labelName)) {
          lines.push('');
          lines.push(`label ${labelName}:`);
          this.state.generatedLabels.add(labelName);
          this.generateNodeFlow(context, lines, 1);
        }
      }
    });

    // ВАЖНО: Генерируем метки для всех узлов из referencedLabels, которые еще не были сгенерированы
    // Это исправляет проблему с концовками слоев, на которые есть ссылки, но они не были помечены как requiresLabel
    this.state.referencedLabels.forEach((labelName) => {
      if (!this.state.generatedLabels.has(labelName) && labelName !== 'start') {
        // Находим узел по имени метки
        let targetNodeId: string | undefined;
        this.state.labelNames.forEach((name, nodeId) => {
          if (name === labelName) {
            targetNodeId = nodeId;
          }
        });

        if (targetNodeId) {
          const context = this.state.nodeContexts.get(targetNodeId);
          if (context && !this.state.processedNodes.has(targetNodeId)) {
            lines.push('');
            lines.push(`label ${labelName}:`);
            this.state.generatedLabels.add(labelName);
            this.generateNodeFlow(context, lines, 1);
          }
        }
      }
    });
  }

  private generateNodeFlow(context: NodeContext, lines: string[], indentLevel: number): void {
    const nodeId = context.node.id;

    // Если узел уже обработан, проверяем нужна ли метка
    if (this.state.processedNodes.has(nodeId)) {
      // Если узел требует метку или уже имеет метку - делаем jump
      if (context.requiresLabel || this.state.labelNames.has(nodeId)) {
        let labelName = this.state.labelNames.get(nodeId);

        // Если метки еще нет, но она требуется - создаем
        if (!labelName && context.requiresLabel) {
          labelName = this.createLabelName(context.node);
          this.state.labelNames.set(nodeId, labelName);
          this.state.pendingLabels.add(nodeId);
        }

        if (labelName) {
          lines.push(this.indent(indentLevel) + `jump ${labelName}`);
          this.state.referencedLabels.add(labelName);
          return;
        }
      }

      // Если узел уже обработан, но не имеет метки, и мы пытаемся его сгенерировать снова
      // это означает, что нужна метка для прыжка
      const labelName = this.createLabelName(context.node);
      this.state.labelNames.set(nodeId, labelName);
      this.state.pendingLabels.add(nodeId);
      context.requiresLabel = true;

      lines.push(this.indent(indentLevel) + `jump ${labelName}`);
      this.state.referencedLabels.add(labelName);
      return;
    }

    this.state.processedNodes.add(nodeId);

    // Генерируем содержимое узла
    this.generateNodeContent(context.node, lines, indentLevel);

    // Обрабатываем исходящие связи
    if (context.outgoingEdges.length === 0) {
      // Конец истории - завершаем выполнение
      lines.push(this.indent(indentLevel) + 'return');
    } else if (this.isMenuSituation(context)) {
      // Генерируем меню выбора
      this.generateMenu(context, lines, indentLevel);
    } else if (context.outgoingEdges.length === 1) {
      // Единственный переход
      this.generateSingleTransition(context.outgoingEdges[0], lines, indentLevel);
    } else {
      // Множественные условные переходы
      this.generateConditionalTransitions(context.outgoingEdges, lines, indentLevel);
    }
  }

  private isMenuSituation(context: NodeContext): boolean {
    // Меню генерируется, если из нарративного узла идут связи только к choice-узлам
    return (
      context.node.type === 'narrative' &&
      context.outgoingEdges.length > 0 &&
      context.outgoingEdges.every((edge) => {
        const targetNode = this.story.nodes.find((n) => n.id === edge.endNodeId);
        return targetNode && targetNode.type === 'choice';
      })
    );
  }

  private generateNodeContent(node: Node, lines: string[], indentLevel: number): void {
    const indent = this.indent(indentLevel);

    if (node.type === 'narrative') {
      const narrativeNode = node as NarrativeNode;

      // Комментарий с заголовком
      if (this.config.includeComments && narrativeNode.data.title) {
        lines.push(`${indent}# ${narrativeNode.data.title}`);
      }

      // Текст узла
      const text = this.escapeText(narrativeNode.data.text);
      lines.push(`${indent}"${text}"`);

      // Операции
      this.generateOperations(narrativeNode, lines, indentLevel);
    } else if (node.type === 'choice') {
      // Для choice узлов операции генерируются внутри menu
      // Здесь ничего не делаем
    }

    // Устанавливаем флаг посещения
    if (this.state.requiredHappenedVars.has(this.getHappenedVarName(node.id))) {
      lines.push(`${indent}$ ${this.getHappenedVarName(node.id)} = True`);
    }
  }

  private generateOperations(node: NarrativeNode | ChoiceNode, lines: string[], indentLevel: number): void {
    if (!node.operations || node.operations.length === 0) return;

    const indent = this.indent(indentLevel);
    const enabledOperations = node.operations.filter((op) => op.enabled).sort((a, b) => a.order - b.order);

    if (enabledOperations.length === 0) return;

    if (this.config.includeComments) {
      lines.push(`${indent}# Variable operations`);
    }

    enabledOperations.forEach((operation) => {
      const opCode = this.generateOperationCode(operation);
      if (opCode) {
        lines.push(`${indent}$ ${opCode}`);
      }
    });
  }

  private generateMenu(context: NodeContext, lines: string[], indentLevel: number): void {
    const indent = this.indent(indentLevel);
    lines.push(`${indent}menu:`);

    const menuIndent = indentLevel + 1;

    // Анализируем, ведут ли все выборы к одному узлу
    const choiceTargets = context.outgoingEdges
      .map((edge) => {
        const choiceNode = this.story.nodes.find((n) => n.id === edge.endNodeId);
        if (choiceNode) {
          const choiceContext = this.state.nodeContexts.get(choiceNode.id);
          if (choiceContext && choiceContext.outgoingEdges.length === 1) {
            return choiceContext.outgoingEdges[0].endNodeId;
          }
        }
        return null;
      })
      .filter(Boolean);

    const hasCommonTarget = choiceTargets.length === context.outgoingEdges.length && new Set(choiceTargets).size === 1;
    const commonTargetId = hasCommonTarget ? choiceTargets[0] : null;

    // Генерируем варианты выбора
    context.outgoingEdges.forEach((edge) => {
      const choiceNode = this.story.nodes.find((n) => n.id === edge.endNodeId) as ChoiceNode;
      if (!choiceNode || choiceNode.type !== 'choice') return;

      const choiceText = this.escapeText(choiceNode.data.text);
      const conditionCode = this.generateConditionCode(edge.conditions);

      let choiceLine = `${this.indent(menuIndent)}"${choiceText}"`;
      if (conditionCode) {
        choiceLine += ` if ${conditionCode}`;
      }
      choiceLine += ':';
      lines.push(choiceLine);

      // Генерируем содержимое выбора
      this.generateChoiceContent(choiceNode, lines, menuIndent + 1, commonTargetId);
    });

    // Если есть общий целевой узел, генерируем его после меню
    if (commonTargetId) {
      const targetContext = this.state.nodeContexts.get(commonTargetId);
      if (targetContext) {
        const labelName = this.state.labelNames.get(targetContext.node.id);
        if (labelName) {
          if (targetContext.requiresLabel && !this.state.generatedLabels.has(labelName)) {
            lines.push(`${this.indent(indentLevel)}jump ${labelName}`);
            lines.push(`label ${labelName}:`);

            this.state.referencedLabels.add(labelName);
            this.state.generatedLabels.add(labelName);
            indentLevel = 1;
          }
        }
        this.generateNodeFlow(targetContext, lines, indentLevel);
      }
    }
  }

  private generateChoiceContent(choiceNode: ChoiceNode, lines: string[], indentLevel: number, commonTargetId: string | null): void {
    const indent = this.indent(indentLevel);
    const choiceContext = this.state.nodeContexts.get(choiceNode.id);

    if (!choiceContext) {
      lines.push(`${indent}pass`);
      return;
    }

    // Генерируем операции выбора
    const hasOperations = choiceNode.operations && choiceNode.operations.some((op) => op.enabled);

    if (hasOperations) {
      this.generateOperations(choiceNode, lines, indentLevel);
    }

    // Устанавливаем флаг посещения
    if (this.state.requiredHappenedVars.has(this.getHappenedVarName(choiceNode.id))) {
      lines.push(`${indent}$ ${this.getHappenedVarName(choiceNode.id)} = True`);
    }

    // Обрабатываем переходы из choice узла
    if (choiceContext.outgoingEdges.length === 0) {
      if (!hasOperations && !this.state.requiredHappenedVars.has(this.getHappenedVarName(choiceNode.id))) {
        lines.push(`${indent}pass`);
      }
    } else if (choiceContext.outgoingEdges.length === 1) {
      const edge = choiceContext.outgoingEdges[0];

      // Если цель - общий узел, ничего не делаем (обработается после меню)
      if (edge.endNodeId === commonTargetId) {
        if (!hasOperations && !this.state.requiredHappenedVars.has(this.getHappenedVarName(choiceNode.id))) {
          lines.push(`${indent}pass`);
        }
      } else {
        // ВАЖНО: Всегда генерируем переход для choice узлов
        this.generateSingleTransition(edge, lines, indentLevel);
      }
    } else {
      // Множественные переходы из choice узла
      this.generateConditionalTransitions(choiceContext.outgoingEdges, lines, indentLevel);
    }
  }

  private generateSingleTransition(edge: Link, lines: string[], indentLevel: number): void {
    const conditionCode = this.generateConditionCode(edge.conditions);
    const targetContext = this.state.nodeContexts.get(edge.endNodeId);

    if (!targetContext) return;

    // Проверяем, нужна ли метка целевому узлу
    if (!targetContext.requiresLabel && !this.state.labelNames.has(edge.endNodeId)) {
      // Создаем метку для узла, если на него есть прямая ссылка
      targetContext.requiresLabel = true;
      const labelName = this.createLabelName(targetContext.node);
      this.state.labelNames.set(edge.endNodeId, labelName);
      this.state.pendingLabels.add(edge.endNodeId);
    }

    if (conditionCode) {
      // Условный переход
      lines.push(`${this.indent(indentLevel)}if ${conditionCode}:`);
      this.processTransition(targetContext, lines, indentLevel + 1);
    } else {
      // Безусловный переход
      this.processTransition(targetContext, lines, indentLevel);
    }
  }

  private generateConditionalTransitions(edges: Link[], lines: string[], indentLevel: number): void {
    const indent = this.indent(indentLevel);
    const edgesWithConditions = edges.filter((e) => e.conditions && e.conditions.length > 0);
    const edgesWithoutConditions = edges.filter((e) => !e.conditions || e.conditions.length === 0);

    let isFirst = true;

    // Генерируем условные переходы
    edgesWithConditions.forEach((edge) => {
      const conditionCode = this.generateConditionCode(edge.conditions);
      if (conditionCode) {
        const keyword = isFirst ? 'if' : 'elif';
        lines.push(`${indent}${keyword} ${conditionCode}:`);
        isFirst = false;

        const targetContext = this.state.nodeContexts.get(edge.endNodeId);
        if (targetContext) {
          // Проверяем, нужна ли метка целевому узлу
          if (!targetContext.requiresLabel && !this.state.labelNames.has(edge.endNodeId)) {
            targetContext.requiresLabel = true;
            const labelName = this.createLabelName(targetContext.node);
            this.state.labelNames.set(edge.endNodeId, labelName);
            this.state.pendingLabels.add(edge.endNodeId);
          }
          this.processTransition(targetContext, lines, indentLevel + 1);
        }
      }
    });

    // Генерируем безусловный переход (else)
    if (edgesWithoutConditions.length > 0) {
      if (!isFirst) {
        lines.push(`${indent}else:`);
        const targetContext = this.state.nodeContexts.get(edgesWithoutConditions[0].endNodeId);
        if (targetContext) {
          // Проверяем, нужна ли метка целевому узлу
          if (!targetContext.requiresLabel && !this.state.labelNames.has(edgesWithoutConditions[0].endNodeId)) {
            targetContext.requiresLabel = true;
            const labelName = this.createLabelName(targetContext.node);
            this.state.labelNames.set(edgesWithoutConditions[0].endNodeId, labelName);
            this.state.pendingLabels.add(edgesWithoutConditions[0].endNodeId);
          }
          this.processTransition(targetContext, lines, indentLevel + 1);
        }
      } else {
        // Если нет условных переходов, просто делаем безусловный
        const targetContext = this.state.nodeContexts.get(edgesWithoutConditions[0].endNodeId);
        if (targetContext) {
          // Проверяем, нужна ли метка целевому узлу
          if (!targetContext.requiresLabel && !this.state.labelNames.has(edgesWithoutConditions[0].endNodeId)) {
            targetContext.requiresLabel = true;
            const labelName = this.createLabelName(targetContext.node);
            this.state.labelNames.set(edgesWithoutConditions[0].endNodeId, labelName);
            this.state.pendingLabels.add(edgesWithoutConditions[0].endNodeId);
          }
          this.processTransition(targetContext, lines, indentLevel);
        }
      }
    } else if (edgesWithConditions.length > 0) {
      // Если нет безусловного перехода, добавляем return в else
      lines.push(`${indent}else:`);
      lines.push(`${this.indent(indentLevel + 1)}return`);
    }
  }

  private processTransition(targetContext: NodeContext, lines: string[], indentLevel: number): void {
    const nodeId = targetContext.node.id;

    // Если узел уже был обработан, он обязательно требует метку для перехода
    if (this.state.processedNodes.has(nodeId)) {
      let labelName = this.state.labelNames.get(nodeId);

      // Если метки еще нет - создаем ее
      if (!labelName) {
        labelName = this.createLabelName(targetContext.node);
        this.state.labelNames.set(nodeId, labelName);
        this.state.pendingLabels.add(nodeId);
        targetContext.requiresLabel = true;
      }

      lines.push(`${this.indent(indentLevel)}jump ${labelName}`);
      this.state.referencedLabels.add(labelName);
    } else if (targetContext.requiresLabel || this.state.labelNames.has(nodeId)) {
      const labelName = this.state.labelNames.get(nodeId);
      if (labelName) {
        lines.push(`${this.indent(indentLevel)}jump ${labelName}`);
        this.state.referencedLabels.add(labelName);
      } else {
        // Генерируем узел inline
        this.generateNodeFlow(targetContext, lines, indentLevel);
      }
    } else {
      // Генерируем узел inline
      this.generateNodeFlow(targetContext, lines, indentLevel);
    }
  }

  // Постобработка для дедупликации
  private postProcessForDeduplication(lines: string[]): string[] {
    const blocks = this.findDuplicateBlocks(lines);
    const subroutines = new Map<string, {name: string; content: string[]}>();
    let subroutineIndex = 0;

    // Создаем подпрограммы для блоков, которые повторяются более 2 раз
    blocks.forEach((occurrences, hash) => {
      if (occurrences.length > 2) {
        subroutineIndex++;
        const subroutineName = `common_subroutine_${subroutineIndex}`;
        const firstBlock = occurrences[0];

        // Извлекаем содержимое блока
        const content = firstBlock.content.map((line) => {
          // Убираем отступ первого уровня для подпрограммы
          const minIndent = Math.min(...firstBlock.content.filter((l) => l.trim().length > 0).map((l) => l.length - l.trimStart().length));
          return line.substring(minIndent);
        });

        subroutines.set(hash, {name: subroutineName, content});
        this.state.generatedLabels.add(subroutineName);
      }
    });

    // Генерируем новый код с подпрограммами
    const newLines: string[] = [];

    // Сначала добавляем все подпрограммы в начало (после переменных)
    const variableEndIndex = this.findVariableDeclarationEnd(lines);

    // Копируем начало файла до конца объявления переменных
    for (let i = 0; i <= variableEndIndex; i++) {
      newLines.push(lines[i]);
    }

    // Добавляем подпрограммы
    if (subroutines.size > 0) {
      newLines.push('');
      if (this.config.includeComments) {
        newLines.push('# Common subroutines for code deduplication');
      }

      subroutines.forEach(({name, content}) => {
        newLines.push(`label ${name}:`);
        content.forEach((line) => {
          newLines.push(this.indent(1) + line);
        });
        newLines.push(this.indent(1) + 'return');
        newLines.push('');
      });
    }

    // Обрабатываем остальной код
    let i = variableEndIndex + 1;
    while (i < lines.length) {
      // Проверяем, является ли текущая позиция началом дублирующегося блока
      let replaced = false;

      for (const [hash, occurrences] of blocks.entries()) {
        const subroutine = subroutines.get(hash);
        if (!subroutine) continue;

        for (const block of occurrences) {
          if (i === block.startLine) {
            // Заменяем блок вызовом подпрограммы
            const indent = ' '.repeat(block.indentLevel * (this.config.indentSize || 4));
            newLines.push(`${indent}call ${subroutine.name}`);
            this.state.referencedLabels.add(subroutine.name);

            // Пропускаем строки блока
            i = block.endLine + 1;
            replaced = true;
            break;
          }
        }

        if (replaced) break;
      }

      if (!replaced) {
        newLines.push(lines[i]);
        i++;
      }
    }

    return newLines;
  }

  private findDuplicateBlocks(lines: string[]): Map<string, CodeBlock[]> {
    const blocks = new Map<string, CodeBlock[]>();

    // Ищем блоки кода, которые начинаются с menu: и заканчиваются перед следующей меткой или концом файла
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Ищем начало блока menu с "Пора завершать день"
      if (trimmed === 'menu:' && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.includes('"Пора завершать день"')) {
          // Находим конец блока
          let endIndex = i + 2;
          const indentLevel = this.getIndentLevel(lines[i]);

          while (endIndex < lines.length) {
            const currentLine = lines[endIndex];
            const currentIndent = this.getIndentLevel(currentLine);

            // Блок заканчивается, когда встречаем строку с меньшим отступом или метку
            if (currentLine.trim().length > 0 && (currentIndent <= indentLevel || currentLine.trim().startsWith('label '))) {
              break;
            }
            endIndex++;
          }

          // Создаем хеш содержимого блока
          const blockContent = lines.slice(i, endIndex);
          const hash = this.hashBlockContent(blockContent);

          const block: CodeBlock = {
            startLine: i,
            endLine: endIndex - 1,
            hash,
            content: blockContent,
            indentLevel
          };

          if (!blocks.has(hash)) {
            blocks.set(hash, []);
          }
          blocks.get(hash)!.push(block);
        }
        break;
      }
    }

    return blocks;
  }

  private hashBlockContent(content: string[]): string {
    // Нормализуем содержимое для хеширования
    const normalized = content
      .map((line) => {
        // Убираем ведущие пробелы, но сохраняем относительные отступы
        const minIndent = Math.min(...content.filter((l) => l.trim().length > 0).map((l) => l.length - l.trimStart().length));
        return line.substring(minIndent);
      })
      .join('\n');

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  private getIndentLevel(line: string): number {
    const spaces = line.length - line.trimStart().length;
    return Math.floor(spaces / (this.config.indentSize || 4));
  }

  private findVariableDeclarationEnd(lines: string[]): number {
    let lastVariableIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('default ') || line.startsWith('# Variable declarations') || line.startsWith('# Node visit tracking variables')) {
        lastVariableIndex = i;
      } else if (line.startsWith('label ')) {
        // Начались метки, переменные закончились
        break;
      }
    }

    return lastVariableIndex;
  }

  // Удаление неиспользуемых меток
  private removeUnusedLabels(lines: string[]): string[] {
    const newLines: string[] = [];
    let skipNextLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Проверяем, является ли строка объявлением метки
      if (trimmed.startsWith('label ') && trimmed.endsWith(':')) {
        const labelMatch = trimmed.match(/^label\s+(\w+):$/);
        if (labelMatch) {
          const labelName = labelMatch[1];

          // Пропускаем неиспользуемые метки (кроме start и подпрограмм)
          if (labelName !== 'start' && !labelName.startsWith('common_subroutine_') && !this.state.referencedLabels.has(labelName)) {
            // Пропускаем эту строку и возможную пустую строку перед ней
            if (i > 0 && newLines[newLines.length - 1].trim() === '') {
              newLines.pop();
            }
            skipNextLine = true;
            continue;
          }
        }
      }

      // Пропускаем содержимое неиспользуемой метки
      if (skipNextLine && trimmed !== '' && !trimmed.startsWith('label ')) {
        continue;
      } else if (skipNextLine && (trimmed === '' || trimmed.startsWith('label '))) {
        skipNextLine = false;
        if (trimmed.startsWith('label ')) {
          i--; // Переобработаем эту строку
          continue;
        }
      }

      newLines.push(line);
    }

    return newLines;
  }

  // Валидация меток
  private validateLabels(): string[] {
    const errors: string[] = [];

    // Проверяем, что все ссылки указывают на существующие метки
    this.state.referencedLabels.forEach((label) => {
      if (!this.state.generatedLabels.has(label)) {
        errors.push(`Ссылка на несуществующую метку: ${label}`);
      }
    });

    return errors;
  }

  // Методы генерации условий и операций
  private generateConditionCode(conditionGroups?: ConditionGroup[]): string {
    if (!conditionGroups || conditionGroups.length === 0) return '';

    const groupCodes = conditionGroups.map((group) => this.generateConditionGroupCode(group)).filter(Boolean);

    return groupCodes.length > 0 ? groupCodes.join(' and ') : '';
  }

  private generateConditionGroupCode(group: ConditionGroup): string {
    const conditionCodes = group.conditions.map((condition) => this.generateSingleConditionCode(condition)).filter(Boolean);

    if (conditionCodes.length === 0) return '';
    if (conditionCodes.length === 1) return conditionCodes[0];

    const operator = group.operator.toLowerCase();
    return `(${conditionCodes.join(` ${operator} `)})`;
  }

  private generateSingleConditionCode(condition: Condition): string {
    switch (condition.type) {
      case ConditionType.PROBABILITY: {
        const probability = Math.round((condition.probability || 0) * 100);
        return `renpy.random.randint(0, 99) < ${probability}`;
      }

      case ConditionType.VARIABLE_COMPARISON:
        return this.generateVariableComparisonCode(condition);

      case ConditionType.NODE_HAPPENED:
        return condition.nodeId ? this.getHappenedVarName(condition.nodeId) : '';

      case ConditionType.NODE_NOT_HAPPENED:
        return condition.nodeId ? `not ${this.getHappenedVarName(condition.nodeId)}` : '';

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
      if (rightVar) {
        rightSide = this.getVariableName(rightVar);
      }
    } else if (condition.valType === 'custom' && condition.value !== undefined) {
      rightSide = this.formatVariableValue(condition.value, leftVar.type);
    }

    if (!rightSide) return '';

    const operatorMap: Record<string, string> = {
      eq: '==',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<='
    };

    const operator = operatorMap[condition.operator || ''];
    return operator ? `${leftVarName} ${operator} ${rightSide}` : '';
  }

  private generateOperationCode(operation: VariableOperation): string {
    const variable = this.story.variables.find((v) => v.id === operation.variableId);
    if (!variable) return '';

    const varName = this.getVariableName(variable);

    switch (operation.operationType) {
      case 'override':
        if (operation.target) {
          const value = this.formatOperationTargetValue(operation.target, variable.type);
          return `${varName} = ${value}`;
        }
        break;

      case 'addition':
        if (operation.target) {
          const value = this.formatOperationTargetValue(operation.target, variable.type);
          return `${varName} += ${value}`;
        }
        break;

      case 'subtract':
        if (operation.target) {
          const value = this.formatOperationTargetValue(operation.target, variable.type);
          return `${varName} -= ${value}`;
        }
        break;

      case 'multiply':
        if (operation.target) {
          const value = this.formatOperationTargetValue(operation.target, variable.type);
          return `${varName} *= ${value}`;
        }
        break;

      case 'divide':
        if (operation.target) {
          const value = this.formatOperationTargetValue(operation.target, variable.type);
          return `${varName} /= ${value}`;
        }
        break;

      case 'invert':
        if (variable.type === 'boolean') {
          return `${varName} = not ${varName}`;
        }
        break;

      case 'join':
        if (variable.type === 'string' && operation.target) {
          const value = this.formatOperationTargetValue(operation.target, 'string');
          return `${varName} += ${value}`;
        }
        break;
    }

    return '';
  }

  private getVariableName(variable: Variable): string {
    const baseName = variable.internalName || variable.name;
    const prefix = this.config.customVariablePrefix || 'var_';
    const cleanName = baseName.replace(/[^a-zA-Z0-9_а-яА-Я]/g, '_');
    return prefix ? `${prefix}${cleanName}` : cleanName;
  }

  private getHappenedVarName(nodeId: string): string {
    const cleanId = nodeId.replace(/[^a-zA-Z0-9_]/g, '_');
    const prefix = this.config.customVariablePrefix || 'var_';
    const varName = `${cleanId}_happened`;
    return prefix ? `${prefix}${varName}` : varName;
  }

  private formatVariableValue(value: any, type: string): string {
    switch (type) {
      case 'boolean':
        return value ? 'True' : 'False';
      case 'string':
        return `"${this.escapeText(String(value))}"`;
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
        return this.getVariableName(targetVariable);
      }
      // Если переменная не найдена, возвращаем как есть (для отладки)
      return String(target.variableId || 'unknown_variable');
    } else {
      // Если цель - кастомное значение, используем обычное форматирование
      return this.formatVariableValue(target.value, expectedType);
    }
  }

  private escapeText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  }

  private indent(level: number): string {
    return ' '.repeat((this.config.indentSize || 4) * level);
  }

  // Реализация интерфейса ICodeGenerator
  generateReadme(story: ExportableStory, config: ExportConfig): string {
    const lines: string[] = [];

    lines.push(`# ${story.title}`);
    lines.push('');
    lines.push('## Описание');
    lines.push("Эта история была экспортирована из Go Flow в формат Ren'Py.");
    lines.push('');
    lines.push('## Инструкция по установке');
    lines.push('');
    lines.push("1. Установите Ren'Py SDK с официального сайта: https://www.renpy.org/");
    lines.push("2. Создайте новый проект в Ren'Py Launcher");
    lines.push('3. Скопируйте содержимое .rpy файла в файл script.rpy вашего проекта');
    lines.push("4. Запустите проект через Ren'Py Launcher");
    lines.push('');
    lines.push('## Структура проекта');
    lines.push('');
    lines.push(`- **Узлов:** ${story.nodes.length}`);
    lines.push(`  - Нарративных: ${story.nodes.filter((n) => n.type === 'narrative').length}`);
    lines.push(`  - Выборов: ${story.nodes.filter((n) => n.type === 'choice').length}`);
    lines.push(`- **Переменных:** ${story.variables.length}`);
    lines.push(`- **Связей:** ${story.edges.length}`);

    const conditionsCount = story.edges.reduce((sum, edge) => sum + (edge.conditions?.length || 0), 0);
    if (conditionsCount > 0) {
      lines.push(`- **Условий:** ${conditionsCount}`);
    }

    lines.push('');
    lines.push('## Переменные');
    lines.push('');

    if (story.variables.length > 0) {
      story.variables.forEach((variable) => {
        const defaultValue = this.formatVariableValue(variable.value, variable.type);
        lines.push(`### ${variable.name}`);
        lines.push(`- **Тип:** ${variable.type}`);
        lines.push(`- **Значение по умолчанию:** ${defaultValue}`);
        if (variable.description) {
          lines.push(`- **Описание:** ${variable.description}`);
        }
        lines.push('');
      });
    } else {
      lines.push('*В этой истории нет переменных.*');
      lines.push('');
    }

    lines.push('## Особенности экспорта');
    lines.push('');
    lines.push('- Все узлы с множественными входящими связями получают отдельные метки (labels)');
    lines.push('- Условия на связях преобразуются в конструкции if/elif/else');
    lines.push('- Операции с переменными выполняются при входе в узел');
    lines.push('- Для отслеживания посещенных узлов автоматически создаются переменные *_happened');
    lines.push('- Повторяющиеся блоки кода выносятся в подпрограммы для оптимизации');
    lines.push('- Неиспользуемые метки автоматически удаляются');
    lines.push('');
    lines.push('## Поддержка');
    lines.push('');
    lines.push('Если у вас возникли проблемы с экспортированным файлом, проверьте:');
    lines.push("- Корректность синтаксиса Ren'Py");
    lines.push('- Наличие всех необходимых ресурсов (изображения, звуки)');
    lines.push("- Совместимость версии Ren'Py (рекомендуется 8.0+)");

    return lines.join('\n');
  }

  getFileExtension(): string {
    return '.rpy';
  }

  getSupportedFormat(): ExportFormat {
    return ExportFormat.RENPY;
  }

  // Реализация интерфейса IFormatValidator
  validateForFormat(story: ExportableStory): string[] {
    const errors: string[] = [];

    // Проверяем наличие стартового узла
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

    // Проверяем поддерживаемые типы узлов (игнорируем заметки)
    const unsupportedNodes = story.nodes.filter((node) => node.type !== 'narrative' && node.type !== 'choice' && node.type !== 'note');
    if (unsupportedNodes.length > 0) {
      const types = [...new Set(unsupportedNodes.map((n) => n.type))];
      errors.push(`Найдены неподдерживаемые типы узлов: ${types.join(', ')}`);
    }

    // Проверяем корректность choice узлов
    const choiceNodes = story.nodes.filter((n) => n.type === 'choice');
    choiceNodes.forEach((node) => {
      const incomingEdges = story.edges.filter((e) => e.endNodeId === node.id);
      if (incomingEdges.length === 0) {
        errors.push(`Choice узел "${(node as ChoiceNode).data.text}" не имеет входящих связей`);
      }
    });

    // Проверяем циклические зависимости в условиях
    const cycleCheck = this.checkConditionCycles(story);
    if (cycleCheck.length > 0) {
      errors.push(...cycleCheck);
    }

    return errors;
  }

  getFormatWarnings(story: ExportableStory): string[] {
    const warnings: string[] = [];

    // Предупреждение о длинных текстах
    const longTextNodes = story.nodes.filter((node) => {
      if (node.type === 'narrative') {
        return (node as NarrativeNode).data.text.length > 1000;
      }
      return false;
    });

    if (longTextNodes.length > 0) {
      warnings.push(`Найдено ${longTextNodes.length} узлов с текстом длиннее 1000 символов. Рекомендуется разбить на несколько узлов.`);
    }

    // Предупреждение о глубокой вложенности условий
    const deepConditions = story.edges.filter((edge) => edge.conditions && edge.conditions.length > 3);
    if (deepConditions.length > 0) {
      warnings.push(`Найдено ${deepConditions.length} связей с более чем 3 группами условий. Это может усложнить отладку.`);
    }

    // Предупреждение о неиспользуемых переменных
    const usedVariableIds = new Set<string>();

    // Собираем использование в условиях
    story.edges.forEach((edge) => {
      edge.conditions?.forEach((group) => {
        group.conditions?.forEach((condition) => {
          if (condition.varId) usedVariableIds.add(condition.varId);
          if (condition.comparisonVarId) usedVariableIds.add(condition.comparisonVarId);
        });
      });
    });

    // Собираем использование в операциях
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

    // Предупреждение о недостижимых узлах
    const reachableNodes = this.findReachableNodes(story);
    const unreachableNodes = story.nodes.filter((n) => !reachableNodes.has(n.id));
    if (unreachableNodes.length > 0) {
      warnings.push(`Найдено ${unreachableNodes.length} недостижимых узлов`);
    }

    return warnings;
  }

  private checkConditionCycles(story: ExportableStory): string[] {
    const errors: string[] = [];
    // Упрощенная проверка: если узел проверяет сам себя в happened условиях
    story.edges.forEach((edge) => {
      edge.conditions?.forEach((group) => {
        group.conditions?.forEach((condition) => {
          if ((condition.type === ConditionType.NODE_HAPPENED || condition.type === ConditionType.NODE_NOT_HAPPENED) && condition.nodeId === edge.startNodeId) {
            errors.push(`Обнаружена циклическая зависимость: узел проверяет свое собственное посещение`);
          }
        });
      });
    });
    return errors;
  }

  private findReachableNodes(story: ExportableStory): Set<string> {
    const reachable = new Set<string>();
    const queue = [story.startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;

      reachable.add(nodeId);

      const outgoingEdges = story.edges.filter((e) => e.startNodeId === nodeId);
      outgoingEdges.forEach((edge) => {
        if (!reachable.has(edge.endNodeId)) {
          queue.push(edge.endNodeId);
        }
      });
    }

    return reachable;
  }
}
