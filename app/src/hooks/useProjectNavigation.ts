import {useCallback} from 'react';

import {useParams, usePathname, useRouter} from 'next/navigation';

export interface ProjectRouteParams {
  projectId: string;
  typeId?: string;
  entityId?: string;
}

export interface ProjectNavigation {
  params: ProjectRouteParams;
  isEntitiesSection: boolean;
  isEntityModalOpen: boolean;
  navigateToProject: (projectId: string) => void;
  navigateToEntities: (projectId: string) => void;
  navigateToEntityType: (projectId: string, typeId: string) => void;
  navigateToEntity: (projectId: string, typeId: string, entityId: string) => void;
  closeEntityModal: () => void;
  getCurrentSection: () => 'about' | 'entities';
}

export const useProjectNavigation = (): ProjectNavigation => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const projectId = params.project_id as string;
  const typeId = params.type_id as string | undefined;
  const entityId = params.entity_id as string | undefined;

  const routeParams: ProjectRouteParams = {
    projectId,
    typeId,
    entityId
  };

  const isEntitiesSection = pathname.includes('/entities');
  const isEntityModalOpen = !!entityId;

  const navigateToProject = useCallback(
    (projectId: string) => {
      router.push(`/${projectId}`);
    },
    [router]
  );

  const navigateToEntities = useCallback(
    (projectId: string) => {
      router.push(`/${projectId}/entities`);
    },
    [router]
  );

  const navigateToEntityType = useCallback(
    (projectId: string, typeId: string) => {
      router.push(`/${projectId}/entities/${typeId}`);
    },
    [router]
  );

  const navigateToEntity = useCallback(
    (projectId: string, typeId: string, entityId: string) => {
      router.push(`/${projectId}/entities/${typeId}/${entityId}`);
    },
    [router]
  );

  const closeEntityModal = useCallback(() => {
    if (typeId) {
      router.push(`/${projectId}/entities/${typeId}`);
    } else {
      router.push(`/${projectId}/entities`);
    }
  }, [router, projectId, typeId]);

  const getCurrentSection = useCallback((): 'about' | 'entities' => {
    return isEntitiesSection ? 'entities' : 'about';
  }, [isEntitiesSection]);

  return {
    params: routeParams,
    isEntitiesSection,
    isEntityModalOpen,
    navigateToProject,
    navigateToEntities,
    navigateToEntityType,
    navigateToEntity,
    closeEntityModal,
    getCurrentSection
  };
};
