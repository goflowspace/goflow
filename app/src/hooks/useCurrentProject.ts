'use client';

import {useParams} from 'next/navigation';

export function useCurrentProject() {
  const params = useParams();
  const projectId = params?.project_id as string | undefined;

  return {
    projectId,
    isProjectLoaded: !!projectId
  };
}
