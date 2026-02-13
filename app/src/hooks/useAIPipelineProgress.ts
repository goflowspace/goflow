import {useCallback, useEffect, useState} from 'react';

import {useWebSocket} from '../contexts/WebSocketContext';
import {useTeamStore} from '../store/useTeamStore';
import {AIProgressStatus} from '../types/websocket.types';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineState {
  status: 'running' | 'completed' | 'failed' | 'idle';
  progress: number;
  stepStates: Record<string, StepStatus>;
  lastChangedStep?: {
    id: string;
    status: StepStatus;
    name: string;
  };
  results?: any; // Final results on completion
  error?: string;
}

export interface UseAIPipelineProgressOptions {
  onProgress?: (state: PipelineState) => void;
  onCompleted?: (state: PipelineState) => void;
  onError?: (state: PipelineState) => void;
}

export const useAIPipelineProgress = (projectId: string, options: UseAIPipelineProgressOptions = {}) => {
  const {currentTeam} = useTeamStore();
  const {subscribeToAIEvents, joinProject, leaveProject, isConnected} = useWebSocket();
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    status: 'idle',
    progress: 0,
    stepStates: {}
  });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!projectId || !isConnected || !currentTeam?.id) {
      return;
    }

    console.log(`🔗 Subscribing to AI events for project: ${projectId}`);
    joinProject(projectId, currentTeam.id);

    const handleProgress = (payload: AIProgressStatus) => {
      setPipelineState((prevState) => {
        const newStepStates: Record<string, StepStatus> = {...prevState.stepStates};

        // Поддерживаем два формата: новый (stepStates) и старый (completedSteps/activeSteps/failedSteps)

        // Новый формат V2 pipelines: payload.stepStates содержит Record<string, StepStatus>
        if ((payload as any).stepStates && typeof (payload as any).stepStates === 'object') {
          console.log('📊 Processing V2 pipeline format with stepStates:', (payload as any).stepStates);
          Object.entries((payload as any).stepStates as Record<string, string>).forEach(([stepId, status]) => {
            // Маппим статусы (V2 pipelines могут иметь разные названия статусов)
            switch (status) {
              case 'completed':
              case 'success':
                newStepStates[stepId] = 'completed';
                break;
              case 'running':
              case 'active':
              case 'in_progress':
                newStepStates[stepId] = 'running';
                break;
              case 'failed':
              case 'error':
                newStepStates[stepId] = 'failed';
                break;
              case 'skipped':
                newStepStates[stepId] = 'skipped';
                break;
              case 'pending':
              default:
                newStepStates[stepId] = 'pending';
                break;
            }
          });
        } else {
          // Старый формат: отдельные массивы completedSteps, activeSteps, failedSteps
          console.log('📊 Processing legacy pipeline format');

          // Обновляем состояние шагов на основе информации из payload
          if (payload.currentStep) {
            newStepStates[payload.currentStep] = 'running';
          }

          if (payload.completedSteps) {
            payload.completedSteps.forEach((stepId) => {
              newStepStates[stepId] = 'completed';
            });
          }

          if (payload.activeSteps) {
            payload.activeSteps.forEach((stepId) => {
              newStepStates[stepId] = 'running';
            });
          }

          if (payload.failedSteps) {
            payload.failedSteps.forEach((stepId) => {
              newStepStates[stepId] = 'failed';
            });
          }
        }

        const newState: PipelineState = {
          status: 'running',
          progress: payload.progress || prevState.progress,
          stepStates: newStepStates,
          lastChangedStep: payload.currentStep
            ? {
                id: payload.currentStep,
                status: 'running',
                name: payload.stepName || payload.currentStep
              }
            : undefined
        };

        // Вызываем callback если есть
        if (options.onProgress) {
          // Делаем это асинхронно чтобы не блокировать setState
          setTimeout(() => options.onProgress?.(newState), 0);
        }

        return newState;
      });

      setIsActive(true);
    };

    const handleCompleted = (payload: AIProgressStatus) => {
      setPipelineState((prevState) => {
        const finalStepStates: Record<string, StepStatus> = {...prevState.stepStates};

        // Поддерживаем оба формата для завершения
        if ((payload as any).stepStates && typeof (payload as any).stepStates === 'object') {
          console.log('📊 Processing V2 pipeline completion with stepStates:', (payload as any).stepStates);
          Object.entries((payload as any).stepStates as Record<string, string>).forEach(([stepId, status]) => {
            switch (status) {
              case 'completed':
              case 'success':
                finalStepStates[stepId] = 'completed';
                break;
              case 'failed':
              case 'error':
                finalStepStates[stepId] = 'failed';
                break;
              case 'skipped':
                finalStepStates[stepId] = 'skipped';
                break;
              default:
                finalStepStates[stepId] = 'completed'; // При завершении считаем все остальное завершенным
                break;
            }
          });
        } else {
          // Помечаем все активные шаги как завершенные (старый формат)
          if (payload.completedSteps) {
            payload.completedSteps.forEach((stepId) => {
              finalStepStates[stepId] = 'completed';
            });
          }
        }

        const newState: PipelineState = {
          status: 'completed',
          progress: 100,
          stepStates: finalStepStates,
          results: payload.completedStepsContent || payload.metadata
        };

        // Вызываем callback асинхронно
        if (options.onCompleted) {
          setTimeout(() => options.onCompleted?.(newState), 0);
        }

        return newState;
      });

      setIsActive(false);
    };

    const handleError = (payload: AIProgressStatus) => {
      setPipelineState((prevState) => {
        const newState: PipelineState = {
          ...prevState,
          status: 'failed',
          error: payload.metadata?.error || 'Unknown error'
        };

        // Вызываем callback асинхронно
        if (options.onError) {
          setTimeout(() => options.onError?.(newState), 0);
        }

        // Сбрасываем состояние через 5 секунд
        setTimeout(() => {
          setPipelineState({status: 'idle', progress: 0, stepStates: {}});
        }, 5000);

        return newState;
      });

      setIsActive(false);
    };

    const unsubscribe = subscribeToAIEvents({
      onAIProgress: handleProgress,
      onAICompleted: handleCompleted,
      onAIError: handleError
    });

    return () => {
      console.log(`🔌 Unsubscribing from AI events for project: ${projectId}`);
      unsubscribe();
      leaveProject(projectId);
    };
  }, [projectId, currentTeam?.id, isConnected, subscribeToAIEvents, joinProject, leaveProject, options]);

  const clearProgress = useCallback(() => {
    setPipelineState({
      status: 'idle',
      progress: 0,
      stepStates: {}
    });
    setIsActive(false);
  }, []);

  return {
    progress: pipelineState,
    pipelineState,
    isActive,
    isConnected,
    clearProgress
  };
};
