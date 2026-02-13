'use client';

import React, {useState} from 'react';

import {useRouter} from 'next/navigation';

import {ArrowLeftIcon, GlobeIcon, TableIcon} from '@radix-ui/react-icons';
import {Badge, Button, Card, Flex, Tabs, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {useLocalizationData} from '../../../hooks/useLocalizationData';
import {buildProjectPath} from '../../../utils/navigation';
import {LocalizationOverview} from './LocalizationOverview';
import {TimelineLocalizationView} from './TimelineLocalizationView';

interface LocalizationWorkspaceProps {
  projectId: string;
}

export const LocalizationWorkspace: React.FC<LocalizationWorkspaceProps> = ({projectId}) => {
  const {t} = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const {projectLocalization, timelineSummaries, stats, isLoading, error, refetch} = useLocalizationData(projectId);

  const handleBackToProject = () => {
    router.push(buildProjectPath(projectId));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Flex align='center' justify='center' style={{minHeight: '400px'}}>
          <Text>{t('common.loading', 'Loading...')}</Text>
        </Flex>
      );
    }
    console.log('error', error);
    if (error) {
      return (
        <Card style={{padding: '24px', textAlign: 'center'}}>
          <Text color='red' size='3'>
            {t('localization.messages.sync_error', 'Error loading localization data')}
          </Text>
          <Button onClick={refetch} style={{marginTop: '16px'}} variant='outline'>
            {t('common.retry', 'Retry')}
          </Button>
        </Card>
      );
    }

    if (activeTab === 'overview') {
      return <LocalizationOverview projectId={projectId} timelineSummaries={timelineSummaries || []} stats={stats} onTimelineSelect={(timelineId) => setActiveTab(timelineId)} onRefetch={refetch} />;
    }

    // Если выбран таймлайн
    const selectedTimeline = timelineSummaries?.find((t) => t.id === activeTab);
    if (selectedTimeline) {
      return <TimelineLocalizationView projectId={projectId} timelineId={activeTab} projectLocalization={projectLocalization} />;
    }

    return null;
  };

  const getViewTitle = () => {
    if (activeTab === 'overview') {
      return t('localization.overview.title', 'Localization Overview');
    }

    const timeline = timelineSummaries?.find((t) => t.id === activeTab);
    return timeline ? timeline.name : t('localization.title', 'Localization');
  };

  return (
    <div style={{padding: '24px'}}>
      {/* Header */}
      <Flex justify='between' align='center' mb='4'>
        <Flex align='center' gap='3'>
          <Button variant='ghost' size='2' onClick={handleBackToProject}>
            <ArrowLeftIcon width='16' height='16' />
            {t('common.back', 'Назад')}
          </Button>
          <GlobeIcon width='24' height='24' />
          <div>
            <Text size='5' weight='bold'>
              {getViewTitle()}
            </Text>
            {projectLocalization && (
              <Flex gap='2' mt='1'>
                <Badge variant='soft' size='1'>
                  {t('localization.overview.base_language')}: {projectLocalization.baseLanguage.toUpperCase()}
                </Badge>
                <Badge variant='soft' size='1' color='blue'>
                  {projectLocalization.targetLanguages.length} {t('localization.overview.target_languages')}
                </Badge>
              </Flex>
            )}
          </div>
        </Flex>
      </Flex>

      {/* Navigation Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value)}>
        <Tabs.List>
          <Tabs.Trigger value='overview'>
            <Flex align='center' gap='2'>
              <TableIcon width='16' height='16' />
              {t('localization.overview.title', 'Overview')}
            </Flex>
          </Tabs.Trigger>

          {timelineSummaries &&
            timelineSummaries.length > 0 &&
            timelineSummaries.map((timeline) => (
              <Tabs.Trigger key={timeline.id} value={timeline.id}>
                <Flex align='center' gap='2'>
                  <GlobeIcon width='16' height='16' />
                  {timeline.name}
                </Flex>
              </Tabs.Trigger>
            ))}
        </Tabs.List>
      </Tabs.Root>

      {/* Content */}
      <div style={{marginTop: '24px'}}>{renderContent()}</div>
    </div>
  );
};
