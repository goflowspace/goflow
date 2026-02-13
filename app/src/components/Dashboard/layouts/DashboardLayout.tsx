'use client';

import React from 'react';

import DashboardThemeProvider from '@components/Dashboard/ThemeProvider/DashboardThemeProvider';

import s from './DashboardLayout.module.css';

// Импортируем CSS для тем

interface DashboardLayoutProps {
  children: React.ReactNode;
  projectsSidebar?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({children, projectsSidebar}) => {
  return (
    <DashboardThemeProvider>
      <div className={s.container}>
        {/* Основная область - теперь двухколоночная */}
        <div className={s.mainArea}>
          {projectsSidebar && <div className={s.projectsSidebar}>{projectsSidebar}</div>}
          <main className={s.mainContent}>{children}</main>
        </div>
      </div>
    </DashboardThemeProvider>
  );
};

export default DashboardLayout;
