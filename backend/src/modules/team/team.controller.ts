import { Request, Response } from "express";
import { asyncHandler } from "@middlewares/errorHandler";
import * as teamService from "./team.service";
import { User } from "@prisma/client";

// Команды
export const createTeam = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as User).id;
    const teamData = req.body;

    const team = await teamService.createTeam(userId, teamData);

    res.status(201).json({
        success: true,
        data: team,
        message: "Команда успешно создана"
    });
});

export const getUserTeams = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;

    const teams = await teamService.getUserTeams(userId);

    res.json({
        success: true,
        data: teams
    });
});

export const getTeamById = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    const team = await teamService.getTeamById(teamId, userId);

    res.json({
        success: true,
        data: team
    });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;
    const updateData = req.body;

    const team = await teamService.updateTeam(teamId, userId, updateData);

    res.json({
        success: true,
        data: team,
        message: "Команда успешно обновлена"
    });
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    const result = await teamService.deleteTeam(teamId, userId);

    res.json({
        success: true,
        message: result.message
    });
});

// Участники команды
export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;
    const inviteData = req.body;

    const invitation = await teamService.inviteMember(teamId, userId, inviteData);

    res.status(201).json({
        success: true,
        data: invitation,
        message: "Приглашение отправлено"
    });
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { token } = req.params;

    const team = await teamService.acceptInvitation(token, userId);

    res.json({
        success: true,
        data: team,
        message: "Приглашение принято"
    });
});

export const declineInvitation = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const result = await teamService.declineInvitation(token);

    res.json({
        success: true,
        message: result.message
    });
});

export const revokeInvitation = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId, invitationId } = req.params;

    const result = await teamService.revokeInvitation(teamId, invitationId, userId);

    res.json({
        success: true,
        message: result.message
    });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId, memberId } = req.params;
    const roleData = req.body;

    const member = await teamService.updateMemberRole(teamId, memberId, userId, roleData);

    res.json({
        success: true,
        data: member,
        message: "Роль участника обновлена"
    });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId, memberId } = req.params;

    const result = await teamService.removeMember(teamId, memberId, userId);

    res.json({
        success: true,
        message: result.message
    });
});

// Проекты команды
export const addProjectToTeam = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;
    const projectData = req.body;

    const teamProject = await teamService.addProjectToTeam(teamId, userId, projectData);

    res.status(201).json({
        success: true,
        data: teamProject,
        message: "Проект добавлен в команду"
    });
});

export const getTeamProjects = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    // Измеряем время проверки доступа к команде
    if (req.timing) {
        req.timing.addMetric('team_access_check', 'Team access validation');
    }

    // Начинаем измерение операций с БД
    if (req.timing) {
        req.timing.endMetric('team_access_check');
        req.timing.addMetric('team_projects_db', 'Database query for team projects');
    }

    const projects = await teamService.getTeamProjects(teamId, userId);

    if (req.timing) {
        req.timing.endMetric('team_projects_db');
        req.timing.addMetric('projects_serialization', 'Projects data serialization');
    }

    res.json({
        success: true,
        data: projects
    });

    if (req.timing) {
        req.timing.endMetric('projects_serialization');
    }
});

export const updateProjectAccess = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId, projectId } = req.params;
    const { accessLevel } = req.body;

    const teamProject = await teamService.updateProjectAccess(teamId, projectId, userId, accessLevel);

    res.json({
        success: true,
        data: teamProject,
        message: "Уровень доступа к проекту обновлен"
    });
});

export const removeProjectFromTeam = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId, projectId } = req.params;

    const result = await teamService.removeProjectFromTeam(teamId, projectId, userId);

    res.json({
        success: true,
        message: result.message
    });
});

// Вспомогательные методы
export const checkTeamAccess = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    const hasAccess = await teamService.checkTeamAccess(teamId, userId);

    res.json({
        success: true,
        data: { hasAccess }
    });
});

export const getUserRoleInTeam = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    const member = await teamService.getUserRoleInTeam(teamId, userId);

    if (!member) {
        res.status(404).json({
            success: false,
            message: 'User is not a member of this team'
        });
        return;
    }

    res.json({
        success: true,
        data: { role: member.role }
    });
});

export const getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    const members = await teamService.getTeamMembers(teamId, userId);

    res.json({
        success: true,
        data: members
    });
});

// Управление доступом к ИИ для участников команды
export const updateMemberAIAccess = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId, memberId } = req.params;
    const { hasAIAccess } = req.body;

    const updatedMember = await teamService.updateMemberAIAccess(teamId, memberId, hasAIAccess, userId);

    res.json({
        success: true,
        data: updatedMember,
        message: hasAIAccess ? "Доступ к ИИ предоставлен" : "Доступ к ИИ отозван"
    });
});

// Проверка доступа к ИИ для участника команды
export const checkMemberAIAccess = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User & { id: string };
    const userId = user.id;
    const { teamId } = req.params;

    const hasAIAccess = await teamService.checkMemberAIAccess(teamId, userId);

    res.json({
        success: true,
        data: { hasAIAccess }
    });
}); 