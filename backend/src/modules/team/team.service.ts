import { prisma } from "@config/prisma";
import { TeamRole, TeamInvitationStatus, TeamProjectAccess, User } from "@prisma/client";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { createError } from "@middlewares/errorHandler";
import { sendInvitationEmail } from "../../utils/email";
import { PaymentsService } from "../payments/payments.service";

const paymentsService = new PaymentsService();

// Типы для запросов
export interface CreateTeamRequest {
    name: string;
    description?: string;
    avatar?: string;
    settings?: any;
}

export interface UpdateTeamRequest {
    name?: string;
    description?: string;
    avatar?: string;
    settings?: any;
}

export interface InviteMemberRequest {
    email: string;
    role: TeamRole;
}

export interface UpdateMemberRoleRequest {
    role: TeamRole;
}

export interface AddProjectToTeamRequest {
    projectId: string;
    accessLevel: TeamProjectAccess;
}

// Команды
export const createTeam = async (userId: string, data: CreateTeamRequest) => {
    const team = await prisma.team.create({
        data: {
            name: data.name,
            description: data.description,
            avatar: data.avatar,
            settings: data.settings || {},
            ownerId: userId,
        },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    picture: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            picture: true,
                        },
                    },
                },
            },
        },
    });

    // Добавляем владельца как администратора с доступом к ИИ
    await prisma.teamMember.create({
        data: {
            teamId: team.id,
            userId: userId,
            role: TeamRole.ADMINISTRATOR,
            hasAIAccess: true, // Владелец команды всегда имеет доступ к ИИ
        },
    });

    return team;
};

export const createDefaultTeamForUser = async (user: Pick<User, 'id' | 'name'>) => {
    const teamName = user.name ? `${user.name}'s Team` : 'My Team';
    return createTeam(user.id, { name: teamName });
};

export const getUserTeams = async (userId: string) => {
    console.log('getUserTeams started for userId:', userId);
    try {
        const teams = await prisma.team.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    {
                        members: {
                            some: {
                                userId: userId,
                            },
                        },
                    },
                ],
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        picture: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                picture: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        members: true,
                        projects: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        
        console.log('getUserTeams found teams:', teams.length);
        return teams;
    } catch (error) {
        console.error('Error in getUserTeams:', error);
        throw error;
    }
};

export const getTeamById = async (teamId: string, userId: string) => {
    const team = await prisma.team.findFirst({
        where: {
            id: teamId,
            OR: [
                { ownerId: userId },
                {
                    members: {
                        some: {
                            userId: userId,
                        },
                    },
                },
            ],
        },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    picture: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            picture: true,
                        },
                    },
                },
                orderBy: {
                    joinedAt: 'desc',
                },
            },
            invitations: {
                where: {
                    status: TeamInvitationStatus.PENDING,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                include: {
                    inviter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
            projects: {
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                    addedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    addedAt: 'desc',
                },
            },
        },
    });

    if (!team) {
        throw new Error("Команда не найдена или нет доступа");
    }

    return team;
};

export const updateTeam = async (teamId: string, userId: string, data: UpdateTeamRequest) => {
    // Проверяем права доступа
    const member = await getUserRoleInTeam(teamId, userId);
    if (!member || (member.role !== TeamRole.ADMINISTRATOR && member.team.ownerId !== userId)) {
        throw new Error("Недостаточно прав для редактирования команды");
    }

    const team = await prisma.team.update({
        where: { id: teamId },
        data: {
            name: data.name,
            description: data.description,
            avatar: data.avatar,
            settings: data.settings,
        },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    picture: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            picture: true,
                        },
                    },
                },
            },
        },
    });

    return team;
};

export const deleteTeam = async (teamId: string, userId: string) => {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { 
            ownerId: true,
            projects: {
                select: {
                    projectId: true
                }
            }
        },
    });

    if (!team) {
        throw new Error("Команда не найдена");
    }

    if (team.ownerId !== userId) {
        throw new Error("Только владелец может удалить команду");
    }

    // Удаляем команду и все связанные проекты в транзакции
    await prisma.$transaction(async (tx) => {
        // Удаляем все проекты команды
        for (const teamProject of team.projects) {
            // Сначала удаляем всех участников проекта
            await tx.projectMember.deleteMany({
                where: { projectId: teamProject.projectId },
            });
            
            // Затем удаляем сам проект
            await tx.project.delete({
                where: { id: teamProject.projectId },
            });
        }
        
        // Удаляем связанные записи командных кредитов и статистики
        // (некоторые связи могут не удаляться автоматически из-за конфликтов ограничений)
        await tx.teamCreditTransaction.deleteMany({
            where: { 
                teamCredits: { teamId } 
            }
        });
        
        await tx.teamCredits.deleteMany({
            where: { teamId }
        });
        
        await tx.teamUsageStats.deleteMany({
            where: { teamId }
        });
        
        await tx.usageStats.deleteMany({
            where: { teamId }
        });
        
        await tx.creditPolicy.deleteMany({
            where: { teamId }
        });
        
        await tx.userCredits.deleteMany({
            where: { teamId }
        });
        
        // Удаляем команду (связи с проектами удалятся автоматически благодаря onDelete: Cascade)
        await tx.team.delete({
            where: { id: teamId },
        });
    });

    return { message: "Команда и все связанные проекты успешно удалены" };
};

// Проверка ограничений подписки при добавлении участников
const checkTeamMembershipLimits = async (teamId: string, newMemberRole: TeamRole): Promise<void> => {
    const subscription = await paymentsService.getActiveTeamSubscription(teamId);
    
    if (!subscription) {
        // Free команда: можно добавлять только observers
        if (newMemberRole !== TeamRole.OBSERVER) {
            throw createError("В бесплатной команде можно приглашать только наблюдателей (observers)", 403);
        }
        return;
    }

    const planType = subscription.price.planType;
    
    // Pro план: можно приглашать любые роли (проверка подписки приглашаемого будет при принятии приглашения)
    if (planType === 'pro') {
        // Разрешаем любые роли при приглашении
        return;
    }

    // Team план: проверяем лимит seats
    if (planType === 'team') {
        if (subscription.maxSeats && subscription.currentSeats >= subscription.maxSeats) {
            throw createError(`Достигнут лимит участников команды: ${subscription.maxSeats}`, 403);
        }
    }
};

// Участники команды
export const inviteMember = async (teamId: string, userId: string, data: InviteMemberRequest) => {
    // Проверяем права доступа
    const member = await getUserRoleInTeam(teamId, userId);
    const allowedRoles: TeamRole[] = [TeamRole.ADMINISTRATOR, TeamRole.MANAGER];
    if (!member || !allowedRoles.includes(member.role)) {
        throw new Error("Недостаточно прав для приглашения участников");
    }

    // Проверяем ограничения подписки
    await checkTeamMembershipLimits(teamId, data.role);

    // Проверяем, не является ли пользователь уже участником
    const existingMember = await prisma.teamMember.findFirst({
        where: {
            teamId,
            user: { email: data.email },
        },
    });

    if (existingMember) {
        throw new Error("Пользователь уже является участником команды");
    }

    // Проверяем, нет ли активного приглашения
    const existingActiveInvitation = await prisma.teamInvitation.findFirst({
        where: {
            teamId,
            email: data.email,
            status: TeamInvitationStatus.PENDING,
            expiresAt: {
                gt: new Date(),
            },
        },
    });

    if (existingActiveInvitation) {
        throw new Error("Приглашение уже отправлено этому email");
    }

    const token = randomUUID();
    const expiresAt = addDays(new Date(), 3); // 3 дня на принятие приглашения

    // Удаляем любые старые приглашения для этого email перед созданием нового
    await prisma.teamInvitation.deleteMany({
        where: {
            teamId,
            email: data.email,
        },
    });

    const invitation = await prisma.teamInvitation.create({
        data: {
            teamId,
            email: data.email,
            role: data.role,
            invitedBy: userId,
            token,
            expiresAt,
            status: TeamInvitationStatus.PENDING,
        },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                },
            },
            inviter: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    await sendInvitationEmail(
        invitation.email,
        invitation.token,
        invitation.team.name,
        invitation.inviter.name || invitation.inviter.email || 'Пользователь'
    );

    return invitation;
};

export const acceptInvitation = async (token: string, userId: string) => {
    const invitation = await prisma.teamInvitation.findUnique({
        where: { token },
        include: {
            team: true,
        },
    });

    if (!invitation) {
        throw new Error("Приглашение не найдено");
    }

    if (invitation.status !== TeamInvitationStatus.PENDING) {
        throw new Error("Приглашение уже обработано");
    }

    if (invitation.expiresAt < new Date()) {
        await prisma.teamInvitation.update({
            where: { id: invitation.id },
            data: { status: TeamInvitationStatus.EXPIRED },
        });
        throw new Error("Приглашение истекло");
    }

    // Получаем email пользователя
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    if (!user) {
        throw new Error("Пользователь не найден");
    }

    if (user.email !== invitation.email) {
        throw new Error("Приглашение отправлено на другой email");
    }

    // Дополнительная проверка лимитов при принятии приглашения
    await checkTeamMembershipLimits(invitation.teamId, invitation.role);


    // Принимаем приглашение с помощью upsert для избежания конфликтов
    try {
        await prisma.$transaction(async (tx) => {
            // Используем upsert для создания/обновления участника команды
            await tx.teamMember.upsert({
                where: {
                    teamId_userId: {
                        teamId: invitation.teamId,
                        userId: userId
                    }
                },
                create: {
                    teamId: invitation.teamId,
                    userId: userId,
                    role: invitation.role,
                    hasAIAccess: false, // По умолчанию новые участники не имеют доступа к ИИ
                },
                update: {
                    // Если участник уже существует, можно обновить роль или ничего не делать
                    role: invitation.role,
                }
            });

            // Обновляем статус приглашения
            await tx.teamInvitation.update({
                where: { id: invitation.id },
                data: { status: TeamInvitationStatus.ACCEPTED },
            });

            // Для Team планов увеличиваем количество занятых мест (если не observer)
            if (invitation.role !== TeamRole.OBSERVER) {
                const subscription = await tx.stripeSubscription.findFirst({
                    where: {
                        teamId: invitation.teamId,
                        status: { in: ['ACTIVE', 'TRIALING'] }
                    },
                    include: { price: true }
                });

                if (subscription && subscription.price.planType === 'team') {
                    await tx.stripeSubscription.update({
                        where: { id: subscription.id },
                        data: { currentSeats: { increment: 1 } }
                    });
                }
            }
        });
    } catch (error) {
        console.error('Error accepting invitation:', error);
        
        // Если ошибка связана с уникальным ограничением, проверим статус
        const updatedInvitation = await prisma.teamInvitation.findUnique({
            where: { id: invitation.id },
            select: { status: true }
        });
        
        // Если приглашение уже принято, считаем операцию успешной
        if (updatedInvitation?.status === TeamInvitationStatus.ACCEPTED) {
            console.log('Invitation already accepted, continuing...');
        } else {
            throw error; // Перебрасываем ошибку, если это не проблема с дублированием
        }
    }

    return invitation.team;
};

export const declineInvitation = async (token: string) => {
    const invitation = await prisma.teamInvitation.findUnique({
        where: { token, status: TeamInvitationStatus.PENDING }
    });

    if (!invitation) {
        throw createError("Приглашение не найдено или уже недействительно", 404);
    }

    await prisma.teamInvitation.delete({
        where: { token }
    });

    return { message: "Приглашение отклонено" };
};

export const revokeInvitation = async (teamId: string, invitationId: string, currentUserId: string) => {
    const member = await prisma.teamMember.findFirst({
        where: {
            teamId,
            userId: currentUserId
        }
    });

    if (!member || !['ADMINISTRATOR', 'MANAGER'].includes(member.role)) {
        throw createError("У вас нет прав для выполнения этого действия", 403);
    }

    const invitation = await prisma.teamInvitation.findUnique({
        where: { id: invitationId }
    });

    if (!invitation || invitation.teamId !== teamId) {
        throw createError("Приглашение не найдено", 404);
    }

    await prisma.teamInvitation.delete({
        where: { id: invitationId }
    });

    return { message: "Приглашение отозвано" };
};

export const updateMemberRole = async (teamId: string, memberId: string, currentUserId: string, data: { role: TeamRole }) => {
    const currentUserMember = await prisma.teamMember.findFirst({
        where: {
            teamId: teamId,
            userId: currentUserId
        }
    });

    if (!currentUserMember || !['ADMINISTRATOR', 'MANAGER'].includes(currentUserMember.role)) {
        throw createError("У вас нет прав для изменения роли", 403);
    }

    const targetMember = await prisma.teamMember.findUnique({
        where: { id: memberId }
    });

    if (!targetMember || targetMember.teamId !== teamId) {
        throw createError("Участник не найден", 404);
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (team?.ownerId === targetMember.userId) {
        throw createError("Роль владельца команды не может быть изменена", 403);
    }
    
    // Проверяем ограничения подписки при изменении роли
    if (data.role !== TeamRole.OBSERVER) {
        const subscription = await paymentsService.getActiveTeamSubscription(teamId);
        if (!subscription) {
            throw createError("В бесплатной команде можно назначать только роль наблюдателя", 403);
        }
    }
    
    if (currentUserMember.role === 'MANAGER') {
        if (data.role === 'ADMINISTRATOR' || data.role === 'MANAGER') {
            throw createError("Менеджер не может назначать роль администратора или другого менеджера", 403);
        }
    }

    const member = await prisma.teamMember.update({
        where: {
            id: memberId,
            teamId,
        },
        data: {
            role: data.role,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    picture: true,
                },
            },
        },
    });

    return member;
};

export const removeMember = async (teamId: string, memberId: string, userId: string) => {
    const userMember = await getUserRoleInTeam(teamId, userId);
    if (!userMember) {
        throw new Error("Вы не являетесь участником команды");
    }

    const targetMember = await prisma.teamMember.findUnique({
        where: { id: memberId },
        include: {
            user: true,
        },
    });

    if (!targetMember || targetMember.teamId !== teamId) {
        throw new Error("Участник не найден");
    }

    // Владелец не может быть удален
    if (userMember.team.ownerId === targetMember.userId) {
        throw new Error("Владелец не может быть удален из команды");
    }

    // Проверяем права: администраторы могут удалять всех, менеджеры - участников и наблюдателей, остальные - только себя
    const allowedRoles: TeamRole[] = [TeamRole.MEMBER, TeamRole.OBSERVER];
    const canRemove = 
        userMember.role === TeamRole.ADMINISTRATOR ||
        (userMember.role === TeamRole.MANAGER && allowedRoles.includes(targetMember.role)) ||
        targetMember.userId === userId;

    if (!canRemove) {
        throw new Error("Недостаточно прав для удаления участника");
    }

    // Удаляем участника и обновляем seats в транзакции
    await prisma.$transaction(async (tx) => {
        // Удаляем участника
        await tx.teamMember.delete({
            where: { id: memberId },
        });

        // Для Team планов уменьшаем количество занятых мест (если не observer)
        if (targetMember.role !== TeamRole.OBSERVER) {
            const subscription = await tx.stripeSubscription.findFirst({
                where: {
                    teamId,
                    status: { in: ['ACTIVE', 'TRIALING'] }
                },
                include: { price: true }
            });

            if (subscription && subscription.price.planType === 'team' && subscription.currentSeats > 0) {
                await tx.stripeSubscription.update({
                    where: { id: subscription.id },
                    data: { currentSeats: { decrement: 1 } }
                });
            }
        }
    });

    return { message: "Участник удален из команды" };
};

// Проверка лимита проектов для команд начиная с 2-й
const checkProjectLimitForTeam = async (teamId: string, userId: string): Promise<void> => {
    // Получаем все команды пользователя где он owner, отсортированные по дате создания
    const ownedTeams = await prisma.team.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true }
    });

    // Если команд меньше 2, ограничение не действует
    if (ownedTeams.length < 2) {
        return;
    }

    // Находим текущую команду в списке
    const currentTeamIndex = ownedTeams.findIndex(team => team.id === teamId);
    
    // Если это первая команда (индекс 0), ограничение не действует
    if (currentTeamIndex === 0) {
        return;
    }

    // Проверяем есть ли активная подписка у текущей команды
    const teamSubscription = await prisma.stripeSubscription.findFirst({
        where: {
            teamId: teamId,
            status: { in: ['ACTIVE', 'TRIALING'] }
        }
    });

    if (!teamSubscription) {
        const error = createError("Один пользователь может владеть только одной бесплатной командой. Все остальные требуют подписки Pro или Team для создания проектов.", 403);
        (error as any).code = 'FREE_PROJECTS_LIMIT';
        throw error;
    }
};

// Проекты команды
export const addProjectToTeam = async (teamId: string, userId: string, data: AddProjectToTeamRequest) => {
    // Проверяем права доступа
    const member = await getUserRoleInTeam(teamId, userId);
    const allowedRoles: TeamRole[] = [TeamRole.ADMINISTRATOR, TeamRole.MANAGER];
    if (!member || !allowedRoles.includes(member.role)) {
        throw new Error("Недостаточно прав для добавления проектов");
    }

    // Проверяем лимит проектов для команд начиная с 2-й
    await checkProjectLimitForTeam(teamId, userId);

    // Проверяем, что проект существует и пользователь имеет к нему доступ
    const project = await prisma.project.findFirst({
        where: {
            id: data.projectId,
            OR: [
                { creatorId: userId },
                {
                    members: {
                        some: {
                            userId,
                            role: { in: ['ADMIN', 'OWNER'] },
                        },
                    },
                },
            ],
        },
    });

    if (!project) {
        throw new Error("Проект не найден или нет прав доступа");
    }

    // Проверяем, не добавлен ли проект уже в команду
    const existingTeamProject = await prisma.teamProject.findFirst({
        where: {
            teamId,
            projectId: data.projectId,
        },
    });

    if (existingTeamProject) {
        throw new Error("Проект уже добавлен в команду");
    }

    const teamProject = await prisma.teamProject.create({
        data: {
            teamId,
            projectId: data.projectId,
            accessLevel: data.accessLevel,
            addedBy: userId,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            addedByUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return teamProject;
};

export const updateProjectAccess = async (teamId: string, projectId: string, userId: string, accessLevel: TeamProjectAccess) => {
    // Проверяем права доступа
    const member = await getUserRoleInTeam(teamId, userId);
    const allowedRoles: TeamRole[] = [TeamRole.ADMINISTRATOR, TeamRole.MANAGER];
    if (!member || !allowedRoles.includes(member.role)) {
        throw new Error("Недостаточно прав для изменения доступа к проектам");
    }

    const teamProject = await prisma.teamProject.update({
        where: {
            teamId_projectId: {
                teamId,
                projectId,
            },
        },
        data: {
            accessLevel,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    return teamProject;
};

export const removeProjectFromTeam = async (teamId: string, projectId: string, userId: string) => {
    // Проверяем права доступа
    const member = await getUserRoleInTeam(teamId, userId);
    const allowedRoles: TeamRole[] = [TeamRole.ADMINISTRATOR, TeamRole.MANAGER];
    if (!member || !allowedRoles.includes(member.role)) {
        throw new Error("Недостаточно прав для удаления проектов");
    }

    await prisma.teamProject.delete({
        where: {
            teamId_projectId: {
                teamId,
                projectId,
            },
        },
    });

    return { message: "Проект удален из команды" };
};

export const getTeamProjects = async (teamId: string, userId: string) => {
    // Проверяем доступ к команде
    const member = await getUserRoleInTeam(teamId, userId);
    if (!member) {
        throw new Error("Вы не являетесь участником команды");
    }

    const teamProjects = await prisma.teamProject.findMany({
        where: { teamId },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    templateId: true,
                    projectInfo: true,
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            addedByUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            addedAt: 'desc',
        },
    });

    // Фильтруем проекты в зависимости от уровня доступа и роли пользователя
    const accessibleProjects = teamProjects.filter(tp => {
        if (tp.accessLevel === TeamProjectAccess.OPEN) return true;
        if (tp.accessLevel === TeamProjectAccess.PRIVATE) {
            return member.role === TeamRole.ADMINISTRATOR || member.team.ownerId === userId;
        }
        // RESTRICTED - нужно дополнительно проверить доступ
        return member.role === TeamRole.ADMINISTRATOR || member.team.ownerId === userId;
    });

    return accessibleProjects;
};

// Вспомогательные функции
export const getUserRoleInTeam = async (teamId: string, userId: string) => {
    const member = await prisma.teamMember.findFirst({
        where: {
            teamId,
            userId,
        },
        include: {
            team: {
                select: {
                    id: true,
                    ownerId: true,
                },
            },
        },
    });

    return member;
};

export const checkTeamAccess = async (teamId: string, userId: string) => {
    const team = await prisma.team.findFirst({
        where: {
            id: teamId,
            OR: [
                { ownerId: userId },
                {
                    members: {
                        some: {
                            userId,
                        },
                    },
                },
            ],
        },
    });

    return !!team;
};

export const getTeamMembers = async (teamId: string, userId: string) => {
    // Проверяем права доступа
    const member = await getUserRoleInTeam(teamId, userId);
    if (!member) {
        throw new Error("Вы не являетесь участником команды");
    }

    const members = await prisma.teamMember.findMany({
        where: { teamId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    picture: true,
                },
            },
        },
        orderBy: {
            joinedAt: 'desc',
        },
    });

    return members;
};

// Управление доступом к ИИ для участников команды
export const updateMemberAIAccess = async (teamId: string, memberId: string, hasAIAccess: boolean, userId: string) => {
    // Проверяем права доступа - только администраторы и владелец могут изменять доступ к ИИ
    const requesterMember = await getUserRoleInTeam(teamId, userId);
    if (!requesterMember || (requesterMember.role !== TeamRole.ADMINISTRATOR && requesterMember.team.ownerId !== userId)) {
        throw new Error("Недостаточно прав для управления доступом к ИИ");
    }

    // Получаем информацию о члене команды, доступ которого изменяем
    const member = await prisma.teamMember.findFirst({
        where: {
            id: memberId,
            teamId: teamId,
        },
        include: {
            team: {
                select: {
                    ownerId: true,
                },
            },
        },
    });

    if (!member) {
        throw new Error("Участник команды не найден");
    }

    // Владелец команды всегда должен иметь доступ к ИИ
    if (member.userId === member.team.ownerId && !hasAIAccess) {
        throw new Error("Владелец команды должен всегда иметь доступ к ИИ");
    }

    // Обновляем доступ к ИИ
    const updatedMember = await prisma.teamMember.update({
        where: { id: memberId },
        data: { hasAIAccess },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    picture: true,
                },
            },
        },
    });

    return updatedMember;
};

// Проверка доступа к ИИ для участника команды
export const checkMemberAIAccess = async (teamId: string, userId: string): Promise<boolean> => {
    const member = await prisma.teamMember.findFirst({
        where: {
            teamId,
            userId,
        },
        include: {
            team: {
                select: {
                    ownerId: true,
                },
            },
        },
    });

    if (!member) {
        return false; // Не участник команды
    }

    // Владелец команды всегда имеет доступ к ИИ
    if (userId === member.team.ownerId) {
        return true;
    }

    return member.hasAIAccess;
}; 