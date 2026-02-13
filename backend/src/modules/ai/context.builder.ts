import { PrismaClient } from '@prisma/client';

export interface NodeContext {
  nodeId: string;
  nodeData?: any;
  surroundingNodes: Array<{
    id: string;
    data?: any;
    relationship: 'parent' | 'child' | 'sibling';
    distance: number;
  }>;
}

export interface ProjectContext {
  name: string;
  description?: string;
  projectInfo?: {
    logline?: string;
    synopsis?: string;
    genres?: string[];
    setting?: string;
    atmosphere?: string;
    mainThemes?: string;
  };
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
  variables?: any;
}

export class ContextBuilder {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Построение полного контекста для AI запроса
   */
  async buildContext(
    projectId: string,
    nodeId?: string,
    radius: number = 1
  ): Promise<{
    project: ProjectContext;
    node?: NodeContext;
    userPreferences?: any;
  }> {
    const [projectContext, nodeContext] = await Promise.all([
      this.buildProjectContext(projectId),
      nodeId ? this.buildNodeContext(projectId, nodeId, radius) : null
    ]);

    return {
      project: projectContext,
      node: nodeContext || undefined
    };
  }

  /**
   * Построение контекста проекта
   */
  private async buildProjectContext(projectId: string): Promise<ProjectContext> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectInfo: true,
        entities: {
          include: {
            entityType: true,
            values: {
              include: {
                parameter: true
              }
            }
          },
          take: 50 // Ограничиваем количество сущностей
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return {
      name: project.name,
      description: project.projectInfo?.logline || undefined,
      projectInfo: {
        logline: project.projectInfo?.logline || undefined,
        synopsis: project.projectInfo?.synopsis || undefined,
        genres: project.projectInfo?.genres || [],
        setting: project.projectInfo?.setting || undefined,
        atmosphere: project.projectInfo?.atmosphere || undefined,
        mainThemes: project.projectInfo?.mainThemes || undefined
      },
      entities: project.entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.entityType.name,
        description: entity.description || undefined
      })),
      variables: project.data ? this.extractVariables(project.data as any) : undefined
    };
  }

  /**
   * Построение контекста узла и его окружения
   */
  private async buildNodeContext(
    projectId: string,
    nodeId: string,
    radius: number
  ): Promise<NodeContext | null> {
    try {
      // Получаем снимок графа проекта
      const snapshot = await this.prisma.graphSnapshot.findUnique({
        where: { id: projectId }
      });

      if (!snapshot) {
        console.warn(`No graph snapshot found for project ${projectId}`);
        return {
          nodeId,
          surroundingNodes: []
        };
      }

      const graphData = snapshot.layers as any;
      
      const currentNode = this.findNodeInGraph(graphData, nodeId);
      
      if (!currentNode) {
        console.warn(`Node ${nodeId} not found in graph`);
        return {
          nodeId,
          surroundingNodes: []
        };
      }

      const surroundingNodes = this.findSurroundingNodes(
        graphData, 
        nodeId, 
        radius
      );

      return {
        nodeId,
        nodeData: currentNode,
        surroundingNodes
      };

    } catch (error) {
      console.error('Error building node context:', error);
      return {
        nodeId,
        surroundingNodes: []
      };
    }
  }

  /**
   * Поиск узла в графе
   */
  private findNodeInGraph(graphData: any, nodeId: string): any {
    if (!graphData) return null;
    
    for (const [_layerKey, layer] of Object.entries(graphData)) {
      const layerData = layer as any;
      
      if (layerData.nodes && layerData.nodes[nodeId]) {
        return layerData.nodes[nodeId];
      }
    }

    return null;
  }

  /**
   * Поиск окружающих узлов
   */
  private findSurroundingNodes(
    graphData: any,
    centerNodeId: string,
    radius: number
  ): Array<{
    id: string;
    data?: any;
    relationship: 'parent' | 'child' | 'sibling';
    distance: number;
  }> {
    const result: Array<{
      id: string;
      data?: any;
      relationship: 'parent' | 'child' | 'sibling';
      distance: number;
    }> = [];

    if (!graphData || !graphData.layers) return result;

    // Собираем все связи из всех слоев
    const allConnections: Array<{ from: string; to: string }> = [];
    const allNodes: { [key: string]: any } = {};

    for (const layer of Object.values(graphData.layers)) {
      const layerData = layer as any;
      
      // Собираем узлы
      if (layerData.nodes) {
        Object.assign(allNodes, layerData.nodes);
      }

      // Собираем связи
      if (layerData.edges) {
        for (const edge of Object.values(layerData.edges)) {
          const edgeData = edge as any;
          if (edgeData.source && edgeData.target) {
            allConnections.push({
              from: edgeData.source,
              to: edgeData.target
            });
          }
        }
      }
    }

    // Ищем соседей на заданном радиусе
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; distance: number; relationship: 'parent' | 'child' | 'sibling' }> = [];

    // Добавляем прямых соседей
    for (const conn of allConnections) {
      if (conn.from === centerNodeId) {
        queue.push({ nodeId: conn.to, distance: 1, relationship: 'child' });
      } else if (conn.to === centerNodeId) {
        queue.push({ nodeId: conn.from, distance: 1, relationship: 'parent' });
      }
    }

    // BFS для поиска узлов в радиусе
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.distance > radius || visited.has(current.nodeId)) {
        continue;
      }

      visited.add(current.nodeId);
      
      const nodeData = allNodes[current.nodeId];
      if (nodeData) {
        result.push({
          id: current.nodeId,
          data: nodeData,
          relationship: current.relationship,
          distance: current.distance
        });
      }

      // Добавляем соседей для следующего уровня
      if (current.distance < radius) {
        for (const conn of allConnections) {
          if (conn.from === current.nodeId && !visited.has(conn.to)) {
            queue.push({ 
              nodeId: conn.to, 
              distance: current.distance + 1, 
              relationship: 'child' 
            });
          } else if (conn.to === current.nodeId && !visited.has(conn.from)) {
            queue.push({ 
              nodeId: conn.from, 
              distance: current.distance + 1, 
              relationship: 'parent' 
            });
          }
        }
      }
    }

    return result.slice(0, 20); // Ограничиваем количество соседей
  }

  /**
   * Извлечение переменных из данных проекта
   */
  private extractVariables(projectData: any): any {
    try {
      if (projectData && projectData.variables) {
        return projectData.variables;
      }
      return {};
    } catch (error) {
      console.error('Error extracting variables:', error);
      return {};
    }
  }

  /**
   * Форматирование контекста в текст для AI
   */
  formatContextForAI(context: {
    project: ProjectContext;
    node?: NodeContext;
  }): string {
    let text = `КОНТЕКСТ ПРОЕКТА:\n`;
    text += `Название: ${context.project.name}\n`;
    
    if (context.project.projectInfo?.logline) {
      text += `Описание: ${context.project.projectInfo.logline}\n`;
    }
    
    if (context.project.projectInfo?.genres?.length) {
      text += `Жанры: ${context.project.projectInfo.genres.join(', ')}\n`;
    }
    
    if (context.project.projectInfo?.setting) {
      text += `Сеттинг: ${context.project.projectInfo.setting}\n`;
    }
    
    if (context.project.projectInfo?.atmosphere) {
      text += `Атмосфера: ${context.project.projectInfo.atmosphere}\n`;
    }

    if (context.project.entities.length > 0) {
      text += `\nСУЩНОСТИ:\n`;
      context.project.entities.slice(0, 10).forEach(entity => {
        text += `- ID:${entity.id} ${entity.name} (${entity.type})`;
        if (entity.description) {
          text += `: ${entity.description}`;
        }
        text += `\n`;
      });
    }

    // Добавляем информацию об используемых сущностях в текущем контексте
    const usedEntityIds = this.collectUsedEntities({ node: context.node });
    if (usedEntityIds.length > 0) {
      text += `\nИСПОЛЬЗУЕМЫЕ СУЩНОСТИ В КОНТЕКСТЕ:\n`;
      usedEntityIds.forEach(entityId => {
        const entity = context.project.entities.find(e => e.id === entityId);
        if (entity) {
          text += `- ID:${entity.id} ${entity.name} (${entity.type}) - УЖЕ ИСПОЛЬЗУЕТСЯ\n`;
        }
      });
      text += `\nПРИ СОЗДАНИИ НОВОГО УЗЛА УЧИТЫВАЙ:\n`;
      text += `- Продолжай использовать уже упомянутых персонажей если это логично\n`;
      text += `- Не забывай про предметы и локации из контекста\n`;
      text += `- Можешь добавить новые релевантные сущности если нужно\n`;
    }

    if (context.node) {
      text += `\nТЕКУЩИЙ УЗЕЛ: ${context.node.nodeId}\n`;
      
      if (context.node.nodeData) {
        text += `Данные узла: ${this.formatNodeData(context.node.nodeData)}\n`;
      }

      if (context.node.surroundingNodes.length > 0) {
        text += `\nОКРУЖЕНИЕ:\n`;
        context.node.surroundingNodes.forEach(neighbor => {
          text += `- ${neighbor.relationship} узел ${neighbor.id}`;
          if (neighbor.data) {
            text += `: ${this.formatNodeData(neighbor.data)}`;
          }
          text += `\n`;
        });
      }
    }

    return text;
  }

  /**
   * Форматирование данных узла
   */
  private formatNodeData(nodeData: any): string {
    try {
      if (nodeData.data && nodeData.data.text) {
        return nodeData.data.text.substring(0, 200) + (nodeData.data.text.length > 200 ? '...' : '');
      }
      if (nodeData.text) {
        return nodeData.text.substring(0, 200) + (nodeData.text.length > 200 ? '...' : '');
      }
      return 'Нет текстового содержимого';
    } catch (error) {
      return 'Ошибка форматирования данных узла';
    }
  }

  /**
   * Извлечение сущностей из данных узла
   */
  private extractEntitiesFromNode(nodeData: any): string[] {
    try {
      // Проверяем различные места где могут храниться сущности
      if (nodeData.data?.attachedEntities && Array.isArray(nodeData.data.attachedEntities)) {
        return nodeData.data.attachedEntities;
      }
      if (nodeData.attachedEntities && Array.isArray(nodeData.attachedEntities)) {
        return nodeData.attachedEntities;
      }
      if (nodeData.entities && Array.isArray(nodeData.entities)) {
        return nodeData.entities;
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Сбор всех используемых сущностей из текущего и соседних узлов
   */
  private collectUsedEntities(context: { node?: NodeContext }): string[] {
    const usedEntities = new Set<string>();

    if (!context.node) return [];

    // Собираем сущности из текущего узла
    if (context.node.nodeData) {
      const currentEntities = this.extractEntitiesFromNode(context.node.nodeData);
      currentEntities.forEach(id => usedEntities.add(id));
    }

    // Собираем сущности из соседних узлов
    context.node.surroundingNodes.forEach(neighbor => {
      if (neighbor.data) {
        const neighborEntities = this.extractEntitiesFromNode(neighbor.data);
        neighborEntities.forEach(id => usedEntities.add(id));
      }
    });

    return Array.from(usedEntities);
  }
} 