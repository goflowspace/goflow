'use client';

import React from 'react';

import {useLayerStore} from '@store/useLayerStore';

import ToolsPanel from '@components/ToolsPanel/ToolsPanel';
import UndoRedoPanel from '@components/UndoRedoPanel/UndoRedoPanel';

import s from './LeftPanel.module.scss';

const LeftPanel = () => {
  return (
    <div className={s.left_panel_wrapper}>
      <ToolsPanel />
      <UndoRedoPanel />
    </div>
  );
};

export default LeftPanel;
