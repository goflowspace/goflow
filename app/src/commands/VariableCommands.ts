import {useGraphStore} from '../store/useGraphStore';
import {useVariablesStore} from '../store/useVariablesStore';
import {Variable} from '../types/variables';
import {Command} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

// --- Команды для управления переменными ---

/**
 * Команда для создания новой переменной
 */
export class CreateVariableCommand implements Command {
  private variable: Variable;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(variable: Variable, projectId?: string) {
    this.variable = variable;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;
  }

  execute(): void {
    const {variables, setVariables} = useVariablesStore.getState();
    setVariables([...variables, this.variable]);

    if (this.projectId) {
      generateAndSaveOperation('variable.created', {variable: this.variable}, this.projectId, this.timelineId);
    }
  }

  undo(): void {
    const {variables, setVariables} = useVariablesStore.getState();
    setVariables(variables.filter((v) => v.id !== this.variable.id));

    if (this.projectId) {
      generateAndSaveOperation('variable.created.undo', {variableId: this.variable.id}, this.projectId, this.timelineId);
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Команда для обновления существующей переменной
 */
export class UpdateVariableCommand implements Command {
  private variableId: string;
  private updates: Partial<Variable>;
  private originalState: Variable | undefined;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(variableId: string, updates: Partial<Variable>, projectId?: string) {
    this.variableId = variableId;
    this.updates = updates;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;
    this.originalState = useVariablesStore.getState().variables.find((v) => v.id === variableId);
  }

  execute(): void {
    if (!this.originalState) return;

    const {variables, setVariables} = useVariablesStore.getState();
    setVariables(variables.map((v) => (v.id === this.variableId ? {...v, ...this.updates} : v)));

    if (this.projectId) {
      generateAndSaveOperation('variable.updated', {variableId: this.variableId, updates: this.updates}, this.projectId, this.timelineId);
    }
  }

  undo(): void {
    if (!this.originalState) return;

    const {variables, setVariables} = useVariablesStore.getState();
    setVariables(variables.map((v) => (v.id === this.variableId ? this.originalState! : v)));

    if (this.projectId) {
      const undoUpdates = Object.keys(this.updates).reduce((acc, key) => {
        acc[key] = this.originalState![key as keyof Variable];
        return acc;
      }, {} as any);

      generateAndSaveOperation('variable.updated.undo', {variableId: this.variableId, updates: undoUpdates}, this.projectId, this.timelineId);
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Команда для удаления переменной
 */
export class DeleteVariableCommand implements Command {
  private variableId: string;
  private originalVariable: Variable | undefined;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(variableId: string, projectId?: string) {
    this.variableId = variableId;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;
    this.originalVariable = useVariablesStore.getState().variables.find((v) => v.id === variableId);
  }

  execute(): void {
    if (!this.originalVariable) return;

    const {variables, setVariables} = useVariablesStore.getState();
    setVariables(variables.filter((v) => v.id !== this.variableId));

    if (this.projectId) {
      generateAndSaveOperation('variable.deleted', {variableId: this.variableId}, this.projectId, this.timelineId);
    }
  }

  undo(): void {
    if (!this.originalVariable) return;

    const {variables, setVariables} = useVariablesStore.getState();
    setVariables([...variables, this.originalVariable]);

    if (this.projectId) {
      generateAndSaveOperation('variable.deleted.undo', {variable: this.originalVariable}, this.projectId, this.timelineId);
    }
  }

  redo(): void {
    this.execute();
  }
}
