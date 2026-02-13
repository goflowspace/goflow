'use client';

import React from 'react';

import {useRouter} from 'next/navigation';

import {CaretDownIcon} from '@radix-ui/react-icons';
import {Button, DropdownMenu, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';
import {getVersionString} from 'src/utils/version';

import {projectManager} from '../../services/projectManager';
import SettingsMenu from './SettingsMenu';

interface FlowDropdownMenuProps {
  onImportToProjectClick?: () => void;
  onExportClick: () => void;
  onOpenWelcomeStory: () => void;
  onChangeLanguage: (lang: string) => void;
  buttonVariant?: 'ghost';
  buttonSize?: '1' | '2' | '3' | '4';
  textSize?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  style?: React.CSSProperties;
}

const FlowDropdownMenu: React.FC<FlowDropdownMenuProps> = ({
  onImportToProjectClick,
  onExportClick,
  onOpenWelcomeStory,
  onChangeLanguage,
  buttonVariant = 'ghost',
  buttonSize = '2',
  textSize = '5',
  style = {}
}) => {
  const router = useRouter();
  const {t} = useTranslation();

  const handleGoToAllProjects = () => {
    // Очищаем состояние ProjectManager при переходе в воркспейс
    // Это гарантирует корректную работу при повторном открытии проектов
    projectManager.cleanup();
    router.push('/projects');
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button size={buttonSize} variant={buttonVariant} color='gray' style={{paddingLeft: 5, paddingRight: 5, margin: 0, ...style}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-1)'}}>
            <div style={{position: 'relative', display: 'inline-block'}}>
              <Text size={textSize} weight='bold' style={{color: 'var(--gray-12)'}}>
                Go Flow
              </Text>
              <sup
                style={{
                  fontSize: '0.9em',
                  color: 'var(--gray-11)',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: '-0.3em',
                  right: '-0.8em'
                }}
              >
                β
              </sup>
            </div>
            <CaretDownIcon style={{marginLeft: 10}} />
          </div>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Group>
          <DropdownMenu.Label>
            <div style={{position: 'relative', display: 'inline-block'}}>
              Go Flow {getVersionString()}
              <sup
                style={{
                  fontSize: '0.7em',
                  color: 'var(--gray-11)',
                  fontWeight: 'normal',
                  marginLeft: '0.2em'
                }}
              >
                beta
              </sup>
            </div>
          </DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onClick={handleGoToAllProjects}>{t('top_bar.all_projects', 'All projects')}</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('top_bar.imp_exp_section', 'Import & Export')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onClick={onExportClick}>{t('top_bar.export_button', 'Export')}</DropdownMenu.Item>
              {onImportToProjectClick && <DropdownMenu.Item onClick={onImportToProjectClick}>{t('top_bar.import_button', 'Import')}</DropdownMenu.Item>}
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={onOpenWelcomeStory}>{t('top_bar.welcome_story_button', 'Open Welcome Story')}</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>{t('top_bar.settings_menu', 'Settings')}</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <SettingsMenu onChangeLanguage={onChangeLanguage} />
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default FlowDropdownMenu;
