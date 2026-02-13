'use client';

import React, {ReactNode} from 'react';

import {ReactFlowProvider} from '@xyflow/react';
import {Panel, PanelGroup, PanelResizeHandle} from 'react-resizable-panels';

import {useUIStore} from '@store/useUIStore';

import {CommandManagerInitializer} from '@components/AppInitializer/CommandManagerInitializer';
import DashboardThemeProvider from '@components/Dashboard/ThemeProvider/DashboardThemeProvider';
import LeftPanel from '@components/LeftPanel/LeftPanel';
import {NotebookPanel} from '@components/Notebook/NotebookPanel';
import PlayBar from '@components/PlayBar/PlayBar';
import {SearchPanel} from '@components/SearchPanel/SearchPanel';
import Sidebar from '@components/Sidebar/Sidebar';
import TopBar from '@components/TopBar/TopBar';

import s from './layout.module.scss';

export const dynamic = 'force-dynamic';

const EditorLayout = ({children}: {children: ReactNode}) => {
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);

  return (
    <DashboardThemeProvider>
      <div className={s.container}>
        <ReactFlowProvider>
          <CommandManagerInitializer />
          <PanelGroup direction='horizontal' className={s.panel_group}>
            {isSidebarOpen && (
              <>
                <Panel defaultSize={17} minSize={17} maxSize={30} id='sidebar' order={1}>
                  <div className={s.panel_content}>
                    <Sidebar />
                  </div>
                </Panel>
                <PanelResizeHandle className={s.resize_handle} />
              </>
            )}
            <Panel id='main' order={2}>
              <div className={s.main_content_wrapper}>
                <TopBar />
                <div className={s.canvas_wrapper}>
                  {children}
                  <LeftPanel />
                  <PlayBar />
                  <SearchPanel />
                  <NotebookPanel />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </ReactFlowProvider>
      </div>
    </DashboardThemeProvider>
  );
};

export default EditorLayout;
