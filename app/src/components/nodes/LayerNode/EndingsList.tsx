import React, {useEffect, useMemo, useRef, useState} from 'react';

import {ComponentInstanceIcon, Link1Icon, PaddingIcon} from '@radix-ui/react-icons';
import {Text} from '@radix-ui/themes';
import {LayerNode as LayerNodeType} from '@types-folder/nodes';
import {Handle, Position, useUpdateNodeInternals} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import {useEditingStore} from '@store/useEditingStore';

import NewObjDialog from '@components/nodes/NewObjDialog/NewObjDialog';

import {AUTO_CONNECT} from '../../../utils/constants';

import s from './EndingsList.module.scss';

interface EndingsListProps {
  currLayerNode: LayerNodeType | null;
  nodeId: string;
  isListOpen: boolean;
  type?: 'start' | 'end';
}

const EndingsList = ({currLayerNode, nodeId, isListOpen, type = 'end'}: EndingsListProps) => {
  const {t} = useTranslation();
  const [selectedEndingId, setSelectedEndingId] = useState<string | null>(null);
  // const [isFilterApplied, setFilterApplied] = useState(false);

  const endingsRef = useRef<HTMLDivElement>(null);

  const hintText =
    type === 'start'
      ? t('layer_object.starts_hint', 'You can connect the start nodes of this layer to nodes from the current layer')
      : t('layer_object.ends_hint', 'You can connect the end nodes of this layer to nodes from the current layer');

  const currentNodes = useMemo(() => {
    if (type === 'start') {
      return currLayerNode?.startingNodes && currLayerNode.startingNodes?.length > 0 ? currLayerNode.startingNodes : null;
    }

    if (type === 'end') {
      return currLayerNode?.endingNodes && currLayerNode.endingNodes?.length > 0 ? currLayerNode.endingNodes : null;
    }

    return null;
  }, [currLayerNode, nodeId, type]);

  const deactivateAllEditingModes = useEditingStore((s) => s.deactivateAllEditingModes);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setSelectedEndingId(null);
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={cls(s.endings_popup, s[`endings_popup__${type}`], {[s.popup_closed]: !isListOpen})}>
      {currentNodes ? (
        <div ref={endingsRef}>
          {type === 'end' && (
            <Text size='1' className={s.ending_hint} as='p' style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}>
              {hintText}
            </Text>
          )}
          <div className={cls(s.nodes_list, {[s.nodes_list__start]: type === 'start', [s.nodes_list__end]: type === 'end'})}>
            {currentNodes.map((ending, idx) => {
              return (
                <div
                  key={ending.id}
                  className={cls(s.node_item, {[s.inactive_node_item]: !isListOpen, [s.selected_node_item]: selectedEndingId === ending.id})}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEndingId(ending.id);
                  }}
                >
                  {ending.type === 'narrative' ? <PaddingIcon className={s.node_icon} /> : ending.type === 'choice' ? <ComponentInstanceIcon className={s.node_icon} /> : null}
                  <Text size='1' className={s.enidng_text} style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}>
                    {ending.data?.text}
                  </Text>
                  <Handle
                    className={cls(s.enidng_handle, {[s.inactive_ending_handle__start]: !isListOpen && type === 'start', [s.inactive_ending_handle__end]: !isListOpen && type === 'end'})}
                    position={type === 'start' ? Position.Left : Position.Right}
                    id={ending.id}
                    type={type === 'start' ? 'target' : 'source'}
                    isConnectable={true}
                    style={{
                      ...(type === 'start' ? {left: `-${AUTO_CONNECT.MINI_PIN_OFFSET_LEFT}px`} : {right: `-${AUTO_CONNECT.MINI_PIN_OFFSET_LEFT}px`}),
                      width: `${AUTO_CONNECT.MINI_PIN_WIDTH}px`,
                      height: `${AUTO_CONNECT.MINI_PIN_HEIGHT}px`,
                      backgroundColor: ending.isConnected ? '#ADDDC0' : '#e8e8e8',
                      borderColor: ending.isConnected ? '#2B9A66' : '#8D8D8D'
                    }}
                  />
                  {selectedEndingId === ending.id && !ending.isConnected && (
                    <NewObjDialog
                      nodeId={nodeId}
                      handleId={ending.id}
                      onBeforeCreate={() => {
                        deactivateAllEditingModes();
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {type === 'start' && (
            <Text size='1' className={s.ending_hint} as='p' style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}>
              {hintText}
            </Text>
          )}
        </div>
      ) : (
        <Text size='1' className={s.ending_hint} as='p' style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}>
          {t('layer_object.no_nodes_hint', "Layer doesn't contain any nodes yet")}
        </Text>
      )}
    </div>
  );
};

export default EndingsList;
