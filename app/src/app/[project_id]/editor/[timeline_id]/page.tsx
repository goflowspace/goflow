'use client';

import {useTeamSwitch} from '@hooks/useTeamSwitch';

import AuthGuard from '@components/AuthGuard/AuthGuard';
import CollaborativeCanvas from '@components/Canvas/CollaborativeCanvas';

const TimelinePage = () => {
  // Обрабатываем переключение команд с автоматическим редиректом
  useTeamSwitch({
    redirectFromProject: true
  });

  return (
    <AuthGuard>
      <CollaborativeCanvas />
    </AuthGuard>
  );
};

export default TimelinePage;
