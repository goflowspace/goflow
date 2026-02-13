import { Router } from "express";
import { authenticateJWT } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validation.middleware";
import * as teamController from "./team.controller";
import * as teamValidation from "./team.validation";
import { asyncHandler } from "@middlewares/errorHandler";
import { z } from "zod";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateJWT);

// Команды
router.post(
    "/",
    validate(z.object({ body: teamValidation.createTeamSchema })),
    asyncHandler(teamController.createTeam)
);

router.get(
    "/",
    validate(z.object({ query: teamValidation.teamsQuerySchema })),
    asyncHandler(teamController.getUserTeams)
);

router.get(
    "/:teamId",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.getTeamById)
);

router.put(
    "/:teamId",
    validate(z.object({
        params: teamValidation.teamIdParamSchema,
        body: teamValidation.updateTeamSchema
    })),
    asyncHandler(teamController.updateTeam)
);

router.delete(
    "/:teamId",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.deleteTeam)
);

// Участники команды
router.get(
    "/:teamId/members",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.getTeamMembers)
);

router.post(
    "/:teamId/members/invite",
    validate(z.object({
        params: teamValidation.teamIdParamSchema,
        body: teamValidation.inviteMemberSchema
    })),
    asyncHandler(teamController.inviteMember)
);

router.put(
    "/:teamId/members/:memberId/role",
    validate(z.object({
        params: teamValidation.memberIdParamSchema,
        body: teamValidation.updateMemberRoleSchema
    })),
    asyncHandler(teamController.updateMemberRole)
);

router.delete(
    "/:teamId/members/:memberId",
    validate(z.object({ params: teamValidation.memberIdParamSchema })),
    asyncHandler(teamController.removeMember)
);

// Управление доступом к ИИ для участников команды
router.put(
    "/:teamId/members/:memberId/ai-access",
    validate(z.object({
        params: teamValidation.memberIdParamSchema,
        body: teamValidation.updateMemberAIAccessSchema
    })),
    asyncHandler(teamController.updateMemberAIAccess)
);

router.get(
    "/:teamId/ai-access",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.checkMemberAIAccess)
);

router.delete(
    "/:teamId/invitations/:invitationId",
    validate(z.object({ params: teamValidation.invitationIdParamSchema })),
    asyncHandler(teamController.revokeInvitation)
);

// Приглашения
router.post(
    "/invitations/:token/accept",
    validate(z.object({ params: teamValidation.invitationTokenParamSchema })),
    asyncHandler(teamController.acceptInvitation)
);

router.post(
    "/invitations/:token/decline",
    validate(z.object({ params: teamValidation.invitationTokenParamSchema })),
    asyncHandler(teamController.declineInvitation)
);

// Проекты команды
router.get(
    "/:teamId/projects",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.getTeamProjects)
);

router.post(
    "/:teamId/projects",
    validate(z.object({
        params: teamValidation.teamIdParamSchema,
        body: teamValidation.addProjectToTeamSchema
    })),
    asyncHandler(teamController.addProjectToTeam)
);

router.put(
    "/:teamId/projects/:projectId/access",
    validate(z.object({
        params: teamValidation.projectParamSchema,
        body: teamValidation.updateProjectAccessSchema
    })),
    asyncHandler(teamController.updateProjectAccess)
);

router.delete(
    "/:teamId/projects/:projectId",
    validate(z.object({ params: teamValidation.projectParamSchema })),
    asyncHandler(teamController.removeProjectFromTeam)
);

// Вспомогательные маршруты
router.get(
    "/:teamId/access",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.checkTeamAccess)
);

router.get(
    "/:teamId/role",
    validate(z.object({ params: teamValidation.teamIdParamSchema })),
    asyncHandler(teamController.getUserRoleInTeam)
);

export default router; 