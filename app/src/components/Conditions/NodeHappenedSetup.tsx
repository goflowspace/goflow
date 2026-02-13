'use client';

import React, {useEffect, useMemo, useState} from 'react';

import {CaretDownIcon, MagnifyingGlassIcon} from '@radix-ui/react-icons';
import {Flex, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '../../store/useGraphStore';
import {NodeHappenedSetupProps} from '../../types/conditions';
import {getAllNodesFromAllLayers} from '../../utils/getAllNodesFromAllLayers';

import styles from './Conditions.module.scss';

export const NodeHappenedSetup: React.FC<NodeHappenedSetupProps> = ({nodeId, onUpdate, edgeId}) => {
  const {t} = useTranslation();
  // State for search query
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Get data of all layers and nodes from graph store
  const graphStore = useGraphStore();
  const layers = graphStore.layers;
  const currentGraphId = graphStore.currentGraphId;

  // Получаем все узлы из всех слоев
  const allNodes = useMemo(() => {
    return getAllNodesFromAllLayers(layers, ['narrative', 'choice']);
  }, [layers]);

  // Фильтруем узлы по поисковому запросу
  const filteredNodes = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return allNodes;
    }

    const query = searchQuery.toLowerCase().trim();
    return allNodes.filter(
      (node) => node.text.toLowerCase().includes(query) || node.name.toLowerCase().includes(query) || node.layerName.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)
    );
  }, [allNodes, searchQuery]);

  // Сортируем узлы: сначала из текущего слоя, затем остальные
  const sortedNodes = useMemo(() => {
    return [...filteredNodes].sort((a, b) => {
      // Узлы из текущего слоя идут первыми
      if (a.layerId === currentGraphId && b.layerId !== currentGraphId) return -1;
      if (a.layerId !== currentGraphId && b.layerId === currentGraphId) return 1;

      // Сортировка по имени слоя
      return a.layerName.localeCompare(b.layerName);
    });
  }, [filteredNodes, currentGraphId]);

  // Get selected node info
  const selectedNode = useMemo(() => {
    if (!nodeId) return null;
    return allNodes.find((node) => node.id === nodeId);
  }, [nodeId, allNodes]);

  // Handle input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSelectOpen(true);

    // Если текст поиска не соответствует имени выбранного узла, сбрасываем выбор
    if (nodeId && value) {
      const selectedNode = allNodes.find((node) => node.id === nodeId);
      if (selectedNode && !selectedNode.name.toLowerCase().includes(value.toLowerCase())) {
        // Сбрасываем выбранный узел, если пользователь изменил текст поиска
        onUpdate('');
      }
    }
  };

  // Функция для очистки выбора
  const clearSelection = () => {
    setSearchQuery('');
    onUpdate('');
    setIsSelectOpen(false);
  };

  // Handle selecting a node
  const handleNodeSelect = (node: any) => {
    // Напрямую используем тип выбранного узла
    if (node.type === 'narrative' || node.type === 'choice') {
      onUpdate(node.id, node.type);
    } else {
      onUpdate(node.id);
    }

    setIsSelectOpen(false);
    // Отображаем название выбранной ноды в поле поиска
    setSearchQuery(node.name);
  };

  // Set initial search query to selected node name
  useEffect(() => {
    if (nodeId) {
      const selectedNode = allNodes.find((node) => node.id === nodeId);
      if (selectedNode) {
        setSearchQuery(selectedNode.name);
      }
    }
  }, [nodeId, allNodes]);

  return (
    <Flex direction='column' gap='3'>
      <Text size='2'>{t('conditions_master.condition_set_happ_text', 'Search and select narrative or choice node:')}</Text>

      <Flex position='relative' width='100%'>
        <Flex position='absolute' align='center' justify='center' className={styles.search_icon_container}>
          <MagnifyingGlassIcon />
        </Flex>

        <div className={styles.search_container}>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('conditions_master.happenned_search_placeholder', 'Type content or name of desired node')}
            onClick={() => setIsSelectOpen(true)}
            className={styles.search_input}
          />
          <div className={styles.clear_button} style={{display: nodeId ? 'block' : 'none'}} onClick={clearSelection}>
            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M12 4L4 12' stroke='#999' strokeWidth='2' strokeLinecap='round' />
              <path d='M4 4L12 12' stroke='#999' strokeWidth='2' strokeLinecap='round' />
            </svg>
          </div>
          <div className={styles.dropdown_button} onClick={() => setIsSelectOpen(!isSelectOpen)}>
            <CaretDownIcon />
          </div>
        </div>

        {isSelectOpen && (
          <div className={`${styles.select_content} ${styles.dropdown_menu}`}>
            {sortedNodes.map((node) => (
              <div key={node.id} className={styles.select_item} data-state={node.id === nodeId ? 'checked' : undefined} onClick={() => handleNodeSelect(node)}>
                <Flex direction='column' className={styles.node_item_text}>
                  <Text size='2' weight={node.id === nodeId ? 'medium' : 'regular'} className={styles.text_truncate}>
                    {node.name} ({node.layerId === currentGraphId ? t('conditions_master.current_layer', 'Current layer') : node.layerName})
                  </Text>
                  <Text size='1' className={`${styles.node_item_subtext} ${styles.text_truncate}`}>
                    {node.text.length > 50 ? `${node.text.substring(0, 50)}...` : node.text}
                  </Text>
                </Flex>
              </div>
            ))}
            {sortedNodes.length === 0 && <div className={`${styles.select_item} ${styles.empty_result}`}>{t('conditions_master.no_nodes_found', 'No nodes found, refine your search')}</div>}
          </div>
        )}
      </Flex>

      <Text size='2'>{t('conditions_master.condition_set_happ_preview', 'Preview of selected node:')}</Text>

      {nodeId ? (
        <Flex gap='2' p='3' className={`${styles.node_preview} ${styles.node_preview_active}`}>
          {selectedNode?.type !== 'choice' && (
            <Flex className={styles.node_preview_header}>
              <Text size='2' className={`${styles.node_preview_title} ${styles.text_truncate}`}>
                {selectedNode?.title || t('conditions_master.no_title', 'No title')}
              </Text>
            </Flex>
          )}
          <Text size='1' className={styles.node_preview_text}>
            {selectedNode?.text || t('conditions_master.no_text', 'No text')}
          </Text>
        </Flex>
      ) : (
        <Flex gap='2' p='3' className={`${styles.node_preview} ${styles.node_preview_empty}`} />
      )}
    </Flex>
  );
};
