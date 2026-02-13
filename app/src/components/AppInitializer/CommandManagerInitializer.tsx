'use client';

import {useEffect} from 'react';

import {useRouter} from 'next/navigation';

import {getCommandManager} from '../../commands/CommandManager';
import {useCurrentProject} from '../../hooks/useCurrentProject';

export const CommandManagerInitializer = () => {
  const router = useRouter();
  const {projectId} = useCurrentProject();

  useEffect(() => {
    const commandManager = getCommandManager();
    commandManager.setRouter(router, projectId);
  }, [router, projectId]);

  return null;
};
