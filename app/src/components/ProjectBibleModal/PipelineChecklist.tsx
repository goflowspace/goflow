import React from 'react';

import {Flex, Spinner, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {PipelineState, StepStatus} from '../../hooks/useAIPipelineProgress';
import {usePipelineStructure} from '../../hooks/usePipelineStructure';
import {GroupWithStatus, StepWithStatus} from '../../types/pipeline.types';

interface PipelineChecklistProps {
  pipelineState: PipelineState;
  isActive: boolean;
  pipelineType?: 'entity_generation' | 'comprehensive_bible' | 'entity_image_generation';
}
//... (rest of the file remains the same, only the props interface changes for now)
const getStatusIcon = (status: StepStatus): string => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'running':
      return '🔄';
    case 'failed':
      return '❌';
    case 'skipped':
      return '⏭️';
    default:
      return '⏳';
  }
};
//...
const getStatusColor = (status: StepStatus): string => {
  switch (status) {
    case 'completed':
      return '#00aa44';
    case 'running':
      return '#0066ff';
    case 'failed':
      return '#ff4444';
    case 'skipped':
      return '#666666';
    default:
      return '#cccccc';
  }
};

const OperationItem: React.FC<{
  step: StepWithStatus;
  isCurrentStep: boolean;
  index: number;
  expandedStepIds: Set<string>;
  onStepClick: (stepId: string, hasExplanation: boolean) => void;
}> = ({step, isCurrentStep, index, expandedStepIds, onStepClick}) => {
  const {t} = useTranslation();
  const isCompleted = step.status === 'completed';
  const hasExplanation = isCompleted && step.explanation && step.explanation !== t('project_bible.pipeline_checklist.explanation_unavailable');
  const isClickable = hasExplanation;
  const isExpanded = expandedStepIds.has(step.id);

  const handleClick = () => {
    if (isClickable) {
      onStepClick(step.id, hasExplanation);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 0',
          borderBottom: '1px solid #f0f0f0',
          opacity: step.status === 'pending' ? 0.6 : 1,
          transition: 'all 0.3s ease',
          cursor: isClickable ? 'pointer' : 'default'
        }}
        onClick={handleClick}
      >
        {/* Operation number with loader */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: step.status === 'running' ? '#0066ff' : step.status === 'completed' ? '#00aa44' : '#e9ecef',
            color: step.status === 'running' || step.status === 'completed' ? 'white' : '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          {step.status === 'running' ? <Spinner size='1' style={{color: 'white'}} /> : step.status === 'completed' ? '✓' : index + 1}
        </div>

        {/* Operation name */}
        <div style={{flex: 1, minWidth: 0}}>
          <Text
            size='2'
            weight={isCurrentStep ? 'medium' : 'regular'}
            style={{
              color: getStatusColor(step.status),
              display: 'block',
              lineHeight: 1.3
            }}
          >
            {step.name}
          </Text>
        </div>

        {/* Expand indicator for completed steps with explanation */}
        {hasExplanation && (
          <div
            style={{
              fontSize: '10px',
              color: '#999',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              opacity: 0.6
            }}
          >
            ▼
          </div>
        )}
      </div>

      {/* Collapsible content */}
      {hasExplanation && isExpanded && (
        <div
          style={{
            marginLeft: '36px',
            marginTop: '2px',
            marginBottom: '4px'
          }}
        >
          {/* Generated content */}
          {step.content && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #e0f2fe'
              }}
            >
              <Text size='2' weight='medium' style={{color: '#0066cc', marginBottom: '8px', display: 'block'}}>
                📝 {t('project_bible.pipeline_checklist.generated_content')}
              </Text>
              <Text size='2' style={{color: '#333', lineHeight: 1.4}}>
                {Array.isArray(step.content) ? step.content.join(', ') : step.content}
              </Text>
            </div>
          )}

          {/* Explanation */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#f9f9f9',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#666',
              lineHeight: 1.3
            }}
          >
            <Text size='1' weight='medium' style={{color: '#888', marginBottom: '4px', display: 'block'}}>
              💭 {t('project_bible.pipeline_checklist.ai_explanation')}
            </Text>
            {step.explanation}
          </div>
        </div>
      )}
    </div>
  );
};

export const PipelineChecklist: React.FC<PipelineChecklistProps> = ({pipelineState, isActive, pipelineType = 'comprehensive_bible'}) => {
  const {t} = useTranslation();
  const {groupsWithStatus, loading, error} = usePipelineStructure(pipelineState, pipelineType);
  const [expandedStepIds, setExpandedStepIds] = React.useState<Set<string>>(new Set());

  const handleStepClick = (stepId: string, hasExplanation: boolean) => {
    if (!hasExplanation) return;
    setExpandedStepIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div style={{padding: '20px'}}>
        <Spinner /> Loading...
      </div>
    );
  }

  if (error) {
    return <div style={{color: 'red'}}>Error: {error}</div>;
  }

  const allSteps: (StepWithStatus & {groupName: string})[] = [];
  groupsWithStatus.forEach((group) => {
    group.steps.forEach((step) => {
      allSteps.push({...step, groupName: group.name});
    });
  });

  const completedSteps = allSteps.filter((step) => step.status === 'completed').length;
  const totalSteps = allSteps.length;

  return (
    <div style={{marginTop: '16px'}}>
      <div style={{marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '12px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
          <Text size='3' weight='bold'>
            {pipelineState.status === 'completed' ? `✅ ${t('project_bible.pipeline_checklist.generation_completed')}` : `🚀 ${t('project_bible.pipeline_checklist.generation_in_progress')}`}
          </Text>
          <Text size='3' weight='bold' style={{color: '#0066ff'}}>
            {pipelineState.progress}%
          </Text>
        </div>
        <div style={{width: '100%', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden'}}>
          <div style={{width: `${pipelineState.progress}%`, height: '100%', background: 'linear-gradient(90deg, #0066ff, #4d94ff)', transition: 'width 0.5s ease'}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px'}}>
          <Text size='2' color='gray'>
            {pipelineState.lastChangedStep?.name || t('project_bible.pipeline_checklist.processing')}
          </Text>
        </div>
      </div>

      <div style={{marginBottom: '16px'}}>
        <Text size='2' weight='medium' style={{color: '#666'}}>
          {t('project_bible.pipeline_checklist.execution_plan', {completed: completedSteps, total: totalSteps})}
        </Text>
      </div>

      <div style={{backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '12px 16px', maxHeight: '200px', overflowY: 'auto'}}>
        {allSteps.map((step, index) => (
          <OperationItem key={step.id} step={step} isCurrentStep={step.id === pipelineState.lastChangedStep?.id} index={index} expandedStepIds={expandedStepIds} onStepClick={handleStepClick} />
        ))}
      </div>
    </div>
  );
};
