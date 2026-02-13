'use client';

import React from 'react';

import type {UsageTeamMember} from '@services/api';
import {useTranslation} from 'react-i18next';

import s from './TeamMemberSelector.module.scss';

interface TeamMemberSelectorProps {
  members: UsageTeamMember[];
  selectedMember?: string;
  onMemberSelect: (memberId?: string) => void;
  isLoading?: boolean;
}

const TeamMemberSelector: React.FC<TeamMemberSelectorProps> = ({members, selectedMember, onMemberSelect, isLoading = false}) => {
  const {t} = useTranslation();

  if (isLoading) {
    return (
      <div className={s.container}>
        <label className={s.label}>{t('usage.filter_by_member')}</label>
        <div className={s.loading}>
          <div className={s.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <label className={s.label} htmlFor='member-selector'>
        {t('usage.filter_by_member')}
      </label>
      <select id='member-selector' className={s.select} value={selectedMember || ''} onChange={(e) => onMemberSelect(e.target.value || undefined)}>
        <option value=''>{t('usage.all_team_members')}</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TeamMemberSelector;
