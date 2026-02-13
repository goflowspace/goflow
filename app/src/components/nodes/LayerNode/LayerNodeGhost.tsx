'use client';

import {memo} from 'react';

import {DoubleArrowDownIcon, DoubleArrowUpIcon} from '@radix-ui/react-icons';
import {Button, Text, Tooltip} from '@radix-ui/themes';
import {useViewport} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import EndingsList from './EndingsList';

import s from './LayerNode.module.scss';

interface LayerNodeGhostProps {
  position: {x: number; y: number};
}

const LayerNodeGhost = memo(({position}: LayerNodeGhostProps) => {
  const {t} = useTranslation();
  const {zoom} = useViewport();

  return (
    <div
      className={cls(s.wrapper, s.ghost)}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left'
      }}
    >
      <div className={s.card}>
        <div>
          <EndingsList currLayerNode={null} nodeId='ghost' isListOpen={true} type='start' />
          <Tooltip content={t('layer_object.starts_hint', 'Start nodes are entry points to this layer from other layers')} delayDuration={1000}>
            <div className={cls(s.popup_toggle, s.popup_toggle__start, s.popup_toggle__start__active)}>
              <DoubleArrowUpIcon />
              <Text className={s.popup_toggle_text} size='1'>
                {t('layer_object.starts_button_hide', 'Hide start nodes')}
              </Text>
            </div>
          </Tooltip>
        </div>
        <div className={s.node_content}>
          <div className={s.layer_name_static} style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5', fontWeight: 800}}>
            {t('layer_object.name_placeholder', 'Add layer name')}
          </div>

          <div className={s.layer_desc_static} style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}>
            {t('layer_object.desc_placeholder', 'Add layer description')}
          </div>

          <div className={s.actions}>
            <Button variant='outline' size='1' className='nodrag'>
              {t('layer_object.open_button', 'Open layer')}
            </Button>
          </div>
        </div>
        <div>
          <Tooltip content={t('layer_object.ends_hint', 'End nodes are exit points from this layer to other layers')} delayDuration={1000}>
            <div className={cls(s.popup_toggle, s.popup_toggle__end, s.popup_toggle__end__active)}>
              <DoubleArrowDownIcon />
              <Text className={s.popup_toggle_text} size='1'>
                {t('layer_object.ends_button_hide', 'Hide end nodes')}
              </Text>
            </div>
          </Tooltip>
          <EndingsList currLayerNode={null} nodeId='ghost' isListOpen={true} type='end' />
        </div>
      </div>
    </div>
  );
});

export default LayerNodeGhost;
