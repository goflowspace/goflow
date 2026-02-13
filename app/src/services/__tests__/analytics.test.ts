import {PlaybackParams, getAggregatedPlayParams} from '../../utils/analyticsUtils';

describe('Analytics Utility Functions', () => {
  describe('getAggregatedPlayParams', () => {
    it('should correctly aggregate play parameters', () => {
      // Упрощенные тестовые данные
      const layers: any = {
        root: {
          id: 'root',
          name: 'root',
          depth: 0,
          type: 'layer',
          nodeIds: ['node1', 'node2', 'node3'],
          nodes: {
            node1: {
              type: 'narrative',
              id: 'node1',
              operations: [{id: 'op1'}, {id: 'op2'}],
              data: {title: 'Custom Title', text: 'Sample text'}
            },
            node2: {
              type: 'choice',
              id: 'node2',
              data: {text: 'Choice text'}
            },
            node3: {
              type: 'note',
              id: 'node3'
            }
          },
          edges: {
            edge1: {
              id: 'edge1',
              conditions: [{id: 'cond1'}, {id: 'cond2'}]
            }
          }
        }
      };

      const variables: any[] = [
        {id: 'var1', name: 'Variable 1'},
        {id: 'var2', name: 'Variable 2'}
      ];

      const result = getAggregatedPlayParams(layers, variables, 'PlayBar');

      // Проверка основных свойств
      expect(result.numberOfLayers).toBe(1);
      expect(result.numberOfNarratives).toBe(1);
      expect(result.numberOfChoices).toBe(1);
      expect(result.numberOfNotes).toBe(1);
      expect(result.numberOfOperations).toBe(2);
      expect(result.numberOfVariables).toBe(2);
      expect(result.numberOfConditions).toBe(2);
      expect(result.numberOfLinksWithConditions).toBe(1);
      expect(result.averageTextLengthInNarrative).toBe(11); // длина "Sample text"
      expect(result.averageTextLengthInChoiсes).toBe(11); // длина "Choice text"
      expect(result.numberOfNarrativesWithUserName).toBe(1); // "Custom Title"
    });
  });
});
