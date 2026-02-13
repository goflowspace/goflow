'use client';

import React, {useCallback, useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useProjects} from '@hooks/useProjects';
import {useTeamSubscription} from '@hooks/useTeamSubscriptions';
import {useUserInitialization} from '@hooks/useUserInitialization';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {ArrowUpIcon, CheckIcon, ChevronDownIcon, Cross2Icon, DotsVerticalIcon, ExclamationTriangleIcon, LockClosedIcon, PlusIcon, TrashIcon} from '@radix-ui/react-icons';
import {type Project, api} from '@services/api';
import {TeamCreditBalance} from '@types-folder/billing';
import {TeamInvitation, TeamMember, TeamRole} from '@types-folder/team';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';

import AccessGuard from '@components/AccessGuard/AccessGuard';
import AuthGuard from '@components/AuthGuard/AuthGuard';
import {ProjectsSidebar} from '@components/Dashboard/ProjectsSidebar';
import CreateTeamModal from '@components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import DashboardLayout from '@components/Dashboard/layouts/DashboardLayout';
import {UserAvatar} from '@components/UserProfile/UserAvatar';
import TeamCreditsBalance from '@components/team/TeamCreditsBalance';

import s from './page.module.css';

const MembersPageContent: React.FC = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const {currentTeam} = useTeamStore();
  const [activeTab, setActiveTab] = useState<'team' | 'pending'>('team');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояние для командных кредитов
  const [teamCredits, setTeamCredits] = useState<TeamCreditBalance | null>(null);
  const [isLoadingTeamCredits, setIsLoadingTeamCredits] = useState(false);
  const [teamCreditsError, setTeamCreditsError] = useState<string | null>(null);
  const [canViewTeamCredits, setCanViewTeamCredits] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('OBSERVER');
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);

  // Состояние для подтверждения удаления
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  // Инициализация пользователя и проектов
  useUserInitialization();
  const {projects, isLoading: isLoadingProjects} = useProjects();

  // Получение подписки команды
  const {subscriptionInfo} = useTeamSubscription(currentTeam?.id);

  const handleProjectSelect = (projectId: string) => {
    router.push(`/${projectId}`);
  };

  const ROLE_DISPLAY_NAMES: Record<TeamRole, string> = {
    ADMINISTRATOR: t('dashboard.members.roles.admin'),
    MANAGER: t('dashboard.members.roles.manager'),
    MEMBER: t('dashboard.members.roles.member'),
    OBSERVER: t('dashboard.members.roles.observer'),
    LOCALIZER: t('dashboard.members.roles.localizer')
  };

  // Определяем доступные роли для приглашения в зависимости от плана команды
  const getAvailableInviteRoles = (): TeamRole[] => {
    const planType = subscriptionInfo?.planType || 'free';

    // Только Team и Enterprise планы имеют доступ ко всем ролям для приглашений
    if (planType === 'team' || planType === 'enterprise') {
      return ['OBSERVER', 'MEMBER', 'MANAGER', 'ADMINISTRATOR', 'LOCALIZER'];
    }

    // Free и Pro планы - только observer
    return ['OBSERVER'];
  };

  const availableRoles = getAvailableInviteRoles();

  // Получаем информацию о доступности ролей для назначения существующим участникам
  const getRoleAccessibilityInfo = () => {
    const allRoles: TeamRole[] = ['OBSERVER', 'MEMBER', 'MANAGER', 'ADMINISTRATOR', 'LOCALIZER'];
    const planType = subscriptionInfo?.planType || 'free';

    // Только Team и Enterprise планы имеют доступ ко всем ролям
    const hasFullAccess = planType === 'team' || planType === 'enterprise';

    return allRoles.map((role) => ({
      role,
      isEnabled: hasFullAccess ? true : role === 'OBSERVER',
      isLocked: !hasFullAccess && role !== 'OBSERVER'
    }));
  };

  const roleAccessibilityInfo = getRoleAccessibilityInfo();

  const loadData = useCallback(async () => {
    if (!currentTeam) {
      setIsLoading(false);
      // Очищаем списки, если команда не выбрана
      setMembers([]);
      setInvitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const teamData = await api.getTeam(currentTeam.id);
      setMembers(teamData.members || []);
      setInvitations(teamData.invitations || []);
    } catch (err) {
      console.error('Failed to load team data:', err);
      // Если команда была удалена, очищаем данные
      if (err instanceof Error && (err.message.includes('404') || err.message.includes('не найдена'))) {
        setMembers([]);
        setInvitations([]);
      } else {
        setError(t('dashboard.members.error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTeam, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Функция для загрузки командных кредитов
  const loadTeamCredits = useCallback(async () => {
    if (!currentTeam) {
      setTeamCredits(null);
      setCanViewTeamCredits(false);
      return;
    }

    // Проверяем права доступа к командным кредитам
    const currentUserMember = members.find((m) => m.user.id === currentTeam.owner?.id || ['ADMINISTRATOR', 'MANAGER'].includes(m.role));

    if (!currentUserMember) {
      setCanViewTeamCredits(false);
      return;
    }

    setCanViewTeamCredits(true);
    setIsLoadingTeamCredits(true);
    setTeamCreditsError(null);

    try {
      const credits = await api.getTeamCredits(currentTeam.id);
      setTeamCredits(credits);
    } catch (err) {
      console.error('Failed to load team credits:', err);
      if (err instanceof Error && err.message.includes('Нет прав')) {
        setCanViewTeamCredits(false);
      } else {
        setTeamCreditsError(err instanceof Error ? err.message : 'Failed to load team credits');
      }
    } finally {
      setIsLoadingTeamCredits(false);
    }
  }, [currentTeam, members]);

  // Загружаем командные кредиты когда загружены участники команды
  useEffect(() => {
    if (!isLoading && members.length > 0) {
      loadTeamCredits();
    }
  }, [isLoading, members, loadTeamCredits]);

  // Сбрасываем роль приглашения, если она недоступна
  useEffect(() => {
    const enabledRoles = roleAccessibilityInfo.filter((info) => info.isEnabled).map((info) => info.role);
    if (!enabledRoles.includes(inviteRole)) {
      const newRole = enabledRoles[0] || 'OBSERVER';
      setInviteRole(newRole);
    }
  }, [roleAccessibilityInfo, inviteRole]);

  const handleInvite = async () => {
    if (!currentTeam || !inviteEmail) return;

    try {
      // Приглашаем с выбранной ролью
      await api.inviteMember(currentTeam.id, {email: inviteEmail, role: inviteRole});
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('OBSERVER'); // Сбрасываем роль к значению по умолчанию
      await loadData(); // Перезагружаем данные после приглашения
    } catch (err) {
      console.error('Failed to invite member:', err);
      // Можно добавить обработку ошибок в UI
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    setMemberToRemove(member);
    setIsRemoveConfirmOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!currentTeam || !memberToRemove) return;

    try {
      await api.removeMember(currentTeam.id, memberToRemove.id);
      await loadData();
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setIsRemoveConfirmOpen(false);
      setMemberToRemove(null);
    }
  };

  const handleUpdateRole = async (memberId: string, role: TeamRole) => {
    if (!currentTeam) return;

    try {
      await api.updateMemberRole(currentTeam.id, {memberId, role});
      await loadData();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleToggleAIAccess = async (memberId: string, hasAIAccess: boolean) => {
    if (!currentTeam) return;

    try {
      await api.updateMemberAIAccess(currentTeam.id, memberId, hasAIAccess);
      await loadData(); // Перезагружаем данные после изменения
    } catch (err) {
      console.error('Failed to update AI access:', err);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!currentTeam) return;

    try {
      await api.revokeInvitation(currentTeam.id, invitationId);
      await loadData();
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
    }
  };

  const handleUpgrade = () => {
    // Редирект на страницу биллинга для апгрейда
    router.push('/billing');
  };

  // Создание сайдбара проектов
  const projectsSidebar = (
    <ProjectsSidebar
      projects={projects}
      selectedProjectId={undefined}
      isLoadingProjects={isLoadingProjects}
      onCreateProject={() => router.push('/projects')}
      onCreateTeam={() => setIsCreateTeamModalOpen(true)}
      onProjectSelect={handleProjectSelect}
      onRenameProject={() => {}}
      onDuplicateProject={() => {}}
      onDeleteProject={() => {}}
    />
  );

  const renderNoTeamView = () => (
    <div className={s.emptyState}>
      <div className={s.emptyStateCard}>
        <h3 className={s.emptyStateTitle}>{t('dashboard.members.no_team.title')}</h3>
        <p className={s.emptyStateDescription}>{t('dashboard.members.no_team.description')}</p>
        <button className={s.emptyCreateButton} onClick={() => setIsCreateTeamModalOpen(true)}>
          <PlusIcon className={s.buttonIcon} />
          {t('dashboard.sidebar.create_team')}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <DashboardLayout projectsSidebar={projectsSidebar}>
        <div className={s.loadingState}>{t('dashboard.members.loading')}</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout projectsSidebar={projectsSidebar}>
        <div className={s.errorState}>{error}</div>
      </DashboardLayout>
    );
  }

  if (!currentTeam) {
    return (
      <DashboardLayout projectsSidebar={projectsSidebar}>
        {renderNoTeamView()}
        <CreateTeamModal isOpen={isCreateTeamModalOpen} onClose={() => setIsCreateTeamModalOpen(false)} onSuccess={loadData} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectsSidebar={projectsSidebar}>
      <div style={{padding: '2rem'}}>
        <div className={s.header}>
          <h1 className={s.title}>{t('dashboard.members.title')}</h1>
          <button className={s.inviteButton} onClick={() => setIsInviteModalOpen(true)}>
            <PlusIcon className={s.buttonIcon} />
            {t('dashboard.members.invite')}
          </button>
        </div>

        {/* Командные кредиты (только для админов/менеджеров/владельцев) */}
        {canViewTeamCredits && <TeamCreditsBalance teamCredits={teamCredits} isLoading={isLoadingTeamCredits} error={teamCreditsError} />}

        {/* Вкладки */}
        <div className={s.tabs}>
          <button className={`${s.tab} ${activeTab === 'team' ? s.tabActive : ''}`} onClick={() => setActiveTab('team')}>
            {t('dashboard.members.tabs.team')}
          </button>
          <button className={`${s.tab} ${activeTab === 'pending' ? s.tabActive : ''}`} onClick={() => setActiveTab('pending')}>
            {t('dashboard.members.tabs.pending')} ({invitations.length})
          </button>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'team' && (
          <div className={s.membersContainer}>
            {members.map((member) => (
              <div key={member.id} className={s.memberRow}>
                <div className={s.memberInfo}>
                  <UserAvatar user={member.user} size='2' />
                  <div className={s.memberDetails}>
                    <div className={s.memberName}>{member.user.name || 'No Name'}</div>
                    <div className={s.memberEmail}>{member.user.email}</div>
                  </div>
                </div>

                <div className={s.memberActions}>
                  {/* Селектор роли */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className={s.roleButton} disabled={member.userId === currentTeam?.creatorId}>
                        {ROLE_DISPLAY_NAMES[member.role]}
                        <ChevronDownIcon className={s.chevronIcon} />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className={s.roleDropdownContent} sideOffset={5}>
                        {/* Если это владелец команды, показываем только его текущую роль */}
                        {member.userId === currentTeam?.owner?.id ? (
                          <DropdownMenu.Item key={member.role} className={s.roleDropdownItem} disabled={true}>
                            {ROLE_DISPLAY_NAMES[member.role]} (владелец)
                          </DropdownMenu.Item>
                        ) : (
                          // Для обычных участников показываем все роли с информацией о доступности
                          roleAccessibilityInfo.map(({role, isEnabled, isLocked}) => (
                            <DropdownMenu.Item
                              key={role}
                              className={`${s.roleDropdownItem} ${isLocked ? s.roleDropdownItemLocked : ''}`}
                              onClick={() => (isEnabled ? handleUpdateRole(member.id, role) : undefined)}
                              disabled={member.role === role || !isEnabled}
                              style={{
                                opacity: isLocked ? 0.6 : 1,
                                cursor: isLocked ? 'not-allowed' : member.role === role ? 'default' : 'pointer'
                              }}
                            >
                              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                                <span>{ROLE_DISPLAY_NAMES[role]}</span>
                                {isLocked && (
                                  <LockClosedIcon
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      opacity: 0.7,
                                      marginLeft: '8px'
                                    }}
                                  />
                                )}
                              </div>
                            </DropdownMenu.Item>
                          ))
                        )}

                        {/* Показываем подсказку об upgrade для free и pro команд */}
                        {member.userId !== currentTeam?.owner?.id && (!subscriptionInfo || subscriptionInfo.planType === 'free' || subscriptionInfo.planType === 'pro') && (
                          <>
                            <DropdownMenu.Separator style={{margin: '4px 0', backgroundColor: '#333'}} />
                            <div style={{padding: '8px 12px', fontSize: '11px', color: '#888', lineHeight: '1.4'}}>
                              <div style={{marginBottom: '4px'}}>🔒 {t('dashboard.members.upgrade_hint_title_pro', 'Больше ролей в Team')}</div>
                              <div style={{fontSize: '10px', opacity: 0.8}}>{t('dashboard.members.upgrade_hint_text_pro', 'Обновитесь до Team для назначения активных ролей')}</div>
                            </div>
                          </>
                        )}

                        <DropdownMenu.Arrow className={s.roleDropdownArrow} />
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  {/* Доступ к ИИ - показывается только для Team планов */}
                  {subscriptionInfo && subscriptionInfo.planType === 'team' && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <label style={{fontSize: '12px', color: '#888', whiteSpace: 'nowrap'}}>ИИ доступ:</label>
                      <button
                        onClick={() => handleToggleAIAccess(member.id, !member.hasAIAccess)}
                        disabled={member.userId === currentTeam?.owner?.id} // Владелец команды всегда имеет доступ
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: '2px solid #666',
                          background: member.hasAIAccess || member.userId === currentTeam?.owner?.id ? '#4CAF50' : 'transparent',
                          cursor: member.userId === currentTeam?.owner?.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: member.userId === currentTeam?.owner?.id ? 0.7 : 1
                        }}
                        aria-label={member.hasAIAccess ? 'Отозвать доступ к ИИ' : 'Предоставить доступ к ИИ'}
                        title={member.userId === currentTeam?.owner?.id ? 'Владелец команды всегда имеет доступ к ИИ' : member.hasAIAccess ? 'Отозвать доступ к ИИ' : 'Предоставить доступ к ИИ'}
                      >
                        {(member.hasAIAccess || member.userId === currentTeam?.owner?.id) && <CheckIcon style={{width: '12px', height: '12px', color: 'white'}} />}
                      </button>
                    </div>
                  )}

                  {/* Кнопка удаления */}
                  <button className={s.removeButton} onClick={() => handleRemoveMember(member)} aria-label={t('dashboard.members.actions.remove')}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className={s.pendingContainer}>
            {invitations.length === 0 ? (
              <div className={s.emptyState}>
                <h3 className={s.emptyTitle}>{t('dashboard.members.empty_invitations.title')}</h3>
                <p className={s.emptyDescription}>{t('dashboard.members.empty_invitations.description')}</p>
                <button className={s.emptyInviteButton} onClick={() => setIsInviteModalOpen(true)}>
                  <PlusIcon className={s.buttonIcon} />
                  {t('dashboard.members.invite')}
                </button>
              </div>
            ) : (
              <div className={s.invitationsList}>
                {invitations.map((invitation) => (
                  <div key={invitation.id} className={s.memberRow}>
                    <div className={s.memberInfo}>
                      <UserAvatar user={{name: '', email: invitation.email}} size='2' />
                      <div className={s.memberDetails}>
                        <div className={s.memberName}>{invitation.email}</div>
                        <div className={s.memberEmail}>{ROLE_DISPLAY_NAMES[invitation.role]}</div>
                      </div>
                    </div>
                    <div className={s.memberActions}>
                      <button className={s.cancelButton} onClick={() => handleRevokeInvitation(invitation.id)}>
                        {t('dashboard.members.actions.cancel')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Модальное окно приглашения */}
        {isInviteModalOpen && (
          <div
            className={s.modalOverlay}
            onClick={() => {
              setIsInviteModalOpen(false);
              setInviteEmail('');
              setInviteRole('OBSERVER');
            }}
          >
            <div className={s.modal} onClick={(e) => e.stopPropagation()}>
              <div className={s.modalHeader}>
                <h2 className={s.modalTitle}>{t('dashboard.members.invite_modal.title')}</h2>
                <button
                  className={s.closeButton}
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setInviteEmail('');
                    setInviteRole('OBSERVER');
                  }}
                >
                  <Cross2Icon className={s.closeIcon} />
                </button>
              </div>

              <div className={s.modalContent}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>{t('dashboard.members.invite_modal.email_label')}</label>
                  <input
                    type='email'
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className={s.fieldInput}
                    placeholder={t('dashboard.members.invite_modal.email_placeholder')}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>{t('dashboard.members.invite_modal.role_label')}</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)} className={s.fieldSelect}>
                    {roleAccessibilityInfo.map(({role, isEnabled}) => (
                      <option key={role} value={role} disabled={!isEnabled}>
                        {ROLE_DISPLAY_NAMES[role]} {!isEnabled ? '🔒' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Кнопка Upgrade для Free и Pro команд */}
                  {(!subscriptionInfo || subscriptionInfo.planType === 'free' || subscriptionInfo.planType === 'pro') && (
                    <div style={{marginTop: '12px'}}>
                      <button
                        onClick={handleUpgrade}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          width: '100%',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      >
                        <ArrowUpIcon style={{width: '12px', height: '12px'}} />
                        {t('dashboard.members.upgrade_to_team_button', 'Upgrade')}
                      </button>

                      <div style={{fontSize: '11px', color: '#666', marginTop: '6px', textAlign: 'center'}}>
                        {t('dashboard.members.upgrade_hint_text_pro', 'Обновитесь до Team для назначения активных ролей')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={s.modalActions}>
                <button className={s.inviteSubmitButton} onClick={handleInvite} disabled={!inviteEmail.trim()}>
                  <PlusIcon className={s.buttonIcon} />
                  {t('dashboard.members.invite_modal.invite_button')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно создания команды */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSuccess={() => {
          console.log('Team created successfully');
          loadData();
        }}
      />

      {/* Модальное окно подтверждения удаления участника */}
      {isRemoveConfirmOpen && memberToRemove && (
        <div
          className={s.modalOverlay}
          onClick={() => {
            setIsRemoveConfirmOpen(false);
            setMemberToRemove(null);
          }}
        >
          <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.confirmModalHeader}>
              <ExclamationTriangleIcon className={s.confirmModalIcon} />
              <h2 className={s.confirmModalTitle}>{t('dashboard.members.confirm_remove.title')}</h2>
            </div>

            <div className={s.confirmModalContent}>
              <p className={s.confirmModalText}>
                {t('dashboard.members.confirm_remove.message', {
                  name: memberToRemove.user.name || memberToRemove.user.email
                })}
              </p>
              <p className={s.confirmModalWarning}>{t('dashboard.members.confirm_remove.warning')}</p>
            </div>

            <div className={s.confirmModalActions}>
              <button
                className={s.confirmModalCancel}
                onClick={() => {
                  setIsRemoveConfirmOpen(false);
                  setMemberToRemove(null);
                }}
              >
                {t('dashboard.members.confirm_remove.cancel')}
              </button>
              <button className={s.confirmModalRemove} onClick={confirmRemoveMember}>
                <ExclamationTriangleIcon className={s.buttonIcon} />
                {t('dashboard.members.confirm_remove.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const MembersPage: React.FC = () => {
  return (
    <AuthGuard>
      <AccessGuard allowedRoles={['ADMINISTRATOR', 'MANAGER']}>
        <MembersPageContent />
      </AccessGuard>
    </AuthGuard>
  );
};

export default MembersPage;
