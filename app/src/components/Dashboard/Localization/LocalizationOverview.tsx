'use client';

import React from 'react';

import {CheckCircledIcon, ClockIcon, ExclamationTriangleIcon, GlobeIcon, PlayIcon, ReloadIcon} from '@radix-ui/react-icons';
import {Badge, Box, Button, Card, Flex, Grid, Progress, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {LocalizationStats, TimelineLocalizationSummary, useTranslationManagement} from '../../../hooks/useLocalizationData';

interface LocalizationOverviewProps {
  projectId: string;
  timelineSummaries: TimelineLocalizationSummary[];
  stats: LocalizationStats | null;
  onTimelineSelect: (timelineId: string) => void;
  onRefetch: () => void;
}

export const LocalizationOverview: React.FC<LocalizationOverviewProps> = ({projectId, timelineSummaries, stats, onTimelineSelect, onRefetch}) => {
  const {t} = useTranslation();
  const {syncTranslations, isLoading: isSyncing} = useTranslationManagement();

  const handleSyncAll = async () => {
    try {
      await syncTranslations(projectId);
      onRefetch();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const getStatusIcon = (status: TimelineLocalizationSummary['overallStatus']) => {
    switch (status) {
      case 'completed':
        return <CheckCircledIcon color='green' />;
      case 'in_progress':
        return <ClockIcon color='orange' />;
      case 'review_needed':
        return <ExclamationTriangleIcon color='yellow' />;
      default:
        return <ClockIcon color='gray' />;
    }
  };

  const getStatusColor = (status: TimelineLocalizationSummary['overallStatus']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'orange';
      case 'review_needed':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      en: t('localization.languages.en', 'English'),
      ru: t('localization.languages.ru', 'Russian'),
      es: t('localization.languages.es', 'Spanish'),
      fr: t('localization.languages.fr', 'French'),
      pt: t('localization.languages.pt', 'Portuguese'),
      de: t('localization.languages.de', 'German'),
      it: t('localization.languages.it', 'Italian'),
      ja: t('localization.languages.ja', 'Japanese'),
      ko: t('localization.languages.ko', 'Korean'),
      'zh-CN': t('localization.languages.zh-CN', 'Chinese (Simplified)')
    };
    return names[code] || code.toUpperCase();
  };

  return (
    <div style={{maxHeight: 'calc(100vh - 200px)', overflowY: 'auto'}}>
      {/* Stats Overview */}
      {stats && (
        <Grid columns='4' gap='4' mb='6'>
          <Card>
            <Box p='3'>
              <Flex direction='column' gap='2'>
                <Text size='2' color='gray'>
                  {t('localization.overview.total_texts', 'Total Texts')}
                </Text>
                <Text size='5' weight='bold'>
                  {stats.totalTexts.toLocaleString()}
                </Text>
              </Flex>
            </Box>
          </Card>

          <Card>
            <Box p='3'>
              <Flex direction='column' gap='2'>
                <Text size='2' color='gray'>
                  {t('localization.overview.words', 'Words')}
                </Text>
                <Text size='5' weight='bold'>
                  {stats.totalWords.toLocaleString()}
                </Text>
              </Flex>
            </Box>
          </Card>

          <Card>
            <Box p='3'>
              <Flex direction='column' gap='2'>
                <Text size='2' color='gray'>
                  {t('localization.overview.translated_texts', 'Translated')}
                </Text>
                <Text size='5' weight='bold'>
                  {Object.values(stats.languageBreakdown).reduce((sum, lang) => sum + lang.translated, 0)}
                </Text>
              </Flex>
            </Box>
          </Card>

          <Card>
            <Box p='3'>
              <Flex direction='column' gap='2'>
                <Text size='2' color='gray'>
                  {t('localization.overview.progress', 'Overall Progress')}
                </Text>
                <Text size='5' weight='bold'>
                  {Math.round(Object.values(stats.languageBreakdown).reduce((sum, lang) => sum + lang.progress, 0) / Math.max(Object.keys(stats.languageBreakdown).length, 1))}%
                </Text>
              </Flex>
            </Box>
          </Card>
        </Grid>
      )}

      {/* Actions */}
      <Flex justify='between' align='center' mb='4'>
        <Text size='4' weight='medium'>
          {t('dashboard.workspace.timelines', 'Timelines')}
        </Text>

        <Flex gap='2'>
          <Button variant='outline' onClick={onRefetch} disabled={isSyncing}>
            <ReloadIcon />
            {t('common.refresh', 'Refresh')}
          </Button>

          <Button onClick={handleSyncAll} disabled={isSyncing}>
            {isSyncing ? <ReloadIcon className='animate-spin' /> : <ReloadIcon />}
            {t('localization.timeline.sync_with_graph', 'Sync with Graph')}
          </Button>
        </Flex>
      </Flex>

      {/* Timelines Grid */}
      {timelineSummaries.length > 0 ? (
        <Grid columns={{initial: '1', md: '2'}} gap='4'>
          {timelineSummaries.map((timeline) => (
            <Card key={timeline.id} style={{cursor: 'pointer'}} onClick={() => onTimelineSelect(timeline.id)}>
              <Box p='4'>
                {/* Timeline Header */}
                <Flex justify='between' align='start' mb='3'>
                  <div>
                    <Flex align='center' gap='2' mb='1'>
                      {getStatusIcon(timeline.overallStatus)}
                      <Text size='3' weight='medium'>
                        {timeline.name}
                      </Text>
                    </Flex>

                    {timeline.description && (
                      <Text size='2' color='gray'>
                        {timeline.description}
                      </Text>
                    )}
                  </div>

                  <Badge variant='soft' color={getStatusColor(timeline.overallStatus)}>
                    {t(`localization.status.${timeline.overallStatus.toUpperCase()}`, timeline.overallStatus)}
                  </Badge>
                </Flex>

                {/* Language Progress */}
                <div>
                  {timeline.languageStats.map((langStat) => (
                    <div key={langStat.language} style={{marginBottom: '12px'}}>
                      <Flex justify='between' align='center' mb='1'>
                        <Text size='2'>{getLanguageName(langStat.language)}</Text>
                        <Text size='1' color='gray'>
                          {langStat.translated}/{langStat.total} ({langStat.progress}%)
                        </Text>
                      </Flex>
                      <Progress value={langStat.progress} />
                    </div>
                  ))}
                </div>

                {/* Timeline Actions */}
                <Flex justify='end' mt='3'>
                  <Button size='1' variant='ghost'>
                    <PlayIcon />
                    {t('localization.timeline.view_timeline', 'View Timeline')}
                  </Button>
                </Flex>
              </Box>
            </Card>
          ))}
        </Grid>
      ) : (
        <Card>
          <Box p='6' style={{textAlign: 'center'}}>
            <GlobeIcon width='48' height='48' style={{margin: '0 auto 16px', opacity: 0.5}} />
            <Text size='4' weight='medium' color='gray' style={{display: 'block', marginBottom: '8px'}}>
              {t('localization.overview.no_timelines', 'No timelines found')}
            </Text>
            <Text size='2' color='gray'>
              {t('localization.overview.sync_first', 'Sync with your project graph to start localization')}
            </Text>
            <Button mt='4' onClick={handleSyncAll} disabled={isSyncing}>
              {isSyncing ? <ReloadIcon className='animate-spin' /> : <ReloadIcon />}
              {t('localization.timeline.sync_with_graph', 'Sync with Graph')}
            </Button>
          </Box>
        </Card>
      )}

      {/* Language Statistics */}
      {stats && Object.keys(stats.languageBreakdown).length > 0 && (
        <Card mt='6'>
          <Box p='4'>
            <Text size='4' weight='medium' mb='3'>
              {t('localization.overview.target_languages', 'Target Languages')}
            </Text>

            <Grid columns={{initial: '1', sm: '2', md: '3'}} gap='3'>
              {Object.entries(stats.languageBreakdown).map(([language, langStats]) => (
                <Box key={language} p='3' style={{border: '1px solid var(--gray-6)', borderRadius: '8px'}}>
                  <Flex justify='between' align='center' mb='2'>
                    <Text size='3' weight='medium'>
                      {getLanguageName(language)}
                    </Text>
                    <Text size='2' color='gray'>
                      {langStats.progress}%
                    </Text>
                  </Flex>

                  <Progress value={langStats.progress} mb='2' />

                  <Flex justify='between'>
                    <Text size='1' color='gray'>
                      {langStats.translated}/{langStats.total}
                    </Text>
                    <Text size='1' color='gray'>
                      {t('localization.overview.approved_texts', 'Approved')}: {langStats.approved}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </Grid>
          </Box>
        </Card>
      )}
    </div>
  );
};
