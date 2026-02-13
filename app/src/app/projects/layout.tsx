'use client';

import React from 'react';

const ProjectsLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  return (
    <div className='min-h-screen bg-white'>
      {/* Top navigation */}
      <header className='fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white'></header>

      {/* Main content */}
      <main className='pt-14'>{children}</main>
    </div>
  );
};

export default ProjectsLayout;
