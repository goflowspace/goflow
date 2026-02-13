'use client';

import React, {memo, useMemo} from 'react';

import {useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {Heading, Text} from '@radix-ui/themes';
import cls from 'classnames';
import {buildEditorPath} from 'src/utils/navigation';

import {useGraphStore} from '@store/useGraphStore';

import s from './Sidebar.module.scss';

interface Props {
  parentId?: string;
  level?: number;
}

export const LayerTree: React.FC<Props> = memo(({parentId = 'root', level = 0}) => {
  const router = useRouter();
  const layers = useGraphStore((s) => s.layers);
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const {projectId} = useCurrentProject();
  const {timelineId} = useCurrentRoute();

  const children = useMemo(() => Object.values(layers).filter((layer) => layer.parentLayerId === parentId), [layers, parentId]);

  // 👇 отрисовываем root на первом уровне
  const rootLayer = layers['root'];

  return (
    <ul className={cls(s.layer_list, {[s.top]: level === 0})}>
      {level === 0 && rootLayer && (
        <li className={s.sidebar_list_item} key={rootLayer.id}>
          <Heading
            onClick={() => projectId && router.push(buildEditorPath(projectId, timelineId))}
            className={cls(s.sub_layer_heading, {
              [s.active]: rootLayer.id === currentGraphId
            })}
            size='1'
            weight='bold'
            as='h4'
          >
            Main Layer
          </Heading>
          <LayerTree parentId='root' level={1} />
        </li>
      )}

      {/* Дочерние слои */}
      {level > 0 &&
        children.map((layer) => {
          const isActive = layer.id === currentGraphId;
          const isTopLevel = layer.parentLayerId === 'root';

          return (
            <li className={s.sidebar_list_item} key={layer.id} style={{marginLeft: level > 0 ? `${level * 8}px` : '0'}}>
              {isTopLevel ? (
                <Heading
                  onClick={() => projectId && router.push(buildEditorPath(projectId, timelineId, layer.id))}
                  className={cls(s.sub_layer_heading, {
                    [s.active]: isActive
                  })}
                  size='1'
                  weight='bold'
                  as='h4'
                >
                  {layer.name}
                </Heading>
              ) : (
                <Text
                  onClick={() => projectId && router.push(buildEditorPath(projectId, timelineId, layer.id))}
                  size='1'
                  className={cls(s.sub_layer_text, {
                    [s.active]: isActive
                  })}
                >
                  {layer.name}
                </Text>
              )}
              <LayerTree parentId={layer.id} level={level + 1} />
            </li>
          );
        })}
    </ul>
  );
});
