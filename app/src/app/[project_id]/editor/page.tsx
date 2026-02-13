'use client';

import {useEffect, useState} from 'react';

import {useParams, useRouter} from 'next/navigation';

import {useTeamSwitch} from '@hooks/useTeamSwitch';
import {api} from '@services/api';
import {buildEditorPath} from 'src/utils/navigation';

const EditorPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.project_id as string;
  const [loading, setLoading] = useState(true);

  // Обрабатываем переключение команд с автоматическим редиректом
  useTeamSwitch({
    redirectFromProject: true
  });

  useEffect(() => {
    const redirectToFirstTimeline = async () => {
      try {
        // Получаем список таймлайнов для проекта
        const timelines = await api.getProjectTimelines({projectId});

        if (timelines && timelines.length > 0) {
          // Находим активный таймлайн или берем первый
          const activeTimeline = timelines.find((t: any) => t.isActive) || timelines[0];
          router.replace(buildEditorPath(projectId, activeTimeline.id));
        } else {
          console.error('No timelines found for project:', projectId);
          // Fallback - возвращаемся к списку проектов
          router.replace('/');
        }
      } catch (error) {
        console.error('Failed to load timelines for project:', projectId, error);
        // Fallback - возвращаемся к списку проектов
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    redirectToFirstTimeline();
  }, [router, projectId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return null;
};

export default EditorPage;
