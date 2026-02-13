import {useEffect, useMemo, useState} from 'react';

import {api} from '../services/api';
import {GroupWithStatus, PipelineStructure, StepWithStatus} from '../types/pipeline.types';
import {PipelineState} from './useAIPipelineProgress';

export const usePipelineStructure = (pipelineState: PipelineState, pipelineType: 'entity_generation' | 'comprehensive_bible' | 'entity_image_generation' = 'comprehensive_bible') => {
  const [structure, setStructure] = useState<PipelineStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStructure = async () => {
      try {
        setLoading(true);
        const data = await api.getPipelineStructure(pipelineType);
        if (data.success) {
          setStructure(data.data);
        } else {
          setError(data.error || 'Failed to load pipeline structure');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadStructure();
  }, [pipelineType]);

  const groupsWithStatus = useMemo((): GroupWithStatus[] => {
    if (!structure || !pipelineState) {
      return [];
    }

    return structure.groups.map((group) => {
      const stepsWithStatus: StepWithStatus[] = group.steps.map((step) => {
        const status = pipelineState.stepStates[step.id] || 'pending';
        return {
          ...step,
          status: status
          // TODO: Add explanations and content from results if needed
        };
      });

      const groupStatus = stepsWithStatus.some((s) => s.status === 'running') ? 'running' : stepsWithStatus.every((s) => s.status === 'completed' || s.status === 'skipped') ? 'completed' : 'pending';

      return {
        ...group,
        status: groupStatus,
        steps: stepsWithStatus
      };
    });
  }, [structure, pipelineState.stepStates]);

  return {
    structure,
    groupsWithStatus,
    loading,
    error
  };
};
