import {useParams} from 'next/navigation';

export const useCurrentRoute = () => {
  const params = useParams();

  const projectId = params?.project_id as string;
  const timelineId = params?.timeline_id as string;
  const layerId = (params?.layer_id as string) || 'root';

  return {
    projectId,
    timelineId,
    layerId
  };
};
