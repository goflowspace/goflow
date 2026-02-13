import { prisma } from "@config/prisma";
import { TeamProjectAccess, TeamRole } from "@prisma/client";

/**
 * Универсальная функция проверки доступа пользователя к проекту
 * Поддерживает:
 * - Прямой доступ как создатель проекта
 * - Прямой доступ как участник проекта  
 * - Доступ через команды с учетом уровней доступа (OPEN, RESTRICTED, PRIVATE)
 */
export const checkUserProjectAccess = async (userId: string, projectId: string, debug = false): Promise<boolean> => {
  if (debug) {
    console.log(`🔍 Checking project access: userId=${userId}, projectId=${projectId}`);
  }
  
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        // Прямой доступ как создатель проекта
        { creatorId: userId },
        // Прямой доступ как участник проекта
        {
          members: {
            some: {
              userId: userId
            }
          }
        },
        // Доступ через команду
        {
          teamProjects: {
            some: {
              team: {
                members: {
                  some: {
                    userId: userId
                  }
                }
              }
            }
          }
        }
      ]
    },
    include: {
      members: {
        select: {
          userId: true
        }
      },
      teamProjects: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              members: {
                where: {
                  userId: userId
                },
                select: {
                  role: true,
                  userId: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!project) {
    if (debug) console.log(`❌ Project not found or no access: projectId=${projectId}`);
    return false;
  }

  if (debug) {
    console.log(`📋 Project found: creatorId=${project.creatorId}, teamProjects count=${project.teamProjects.length}`);
  }

  // Если есть прямой доступ как создатель или участник - разрешаем
  if (project.creatorId === userId) {
    if (debug) console.log(`✅ Access granted: user is project creator`);
    return true;
  }
  
  if (project.members.some((member: any) => member.userId === userId)) {
    if (debug) console.log(`✅ Access granted: user is project member`);
    return true;
  }

  // Проверяем доступ через команды с учетом уровня доступа
  for (const teamProject of project.teamProjects) {
    if (debug) {
      console.log(`🏢 Checking team: ${teamProject.team.name} (${teamProject.team.id}), accessLevel=${teamProject.accessLevel}, userInTeam=${teamProject.team.members.length > 0}`);
    }
    
    const userTeamMember = teamProject.team.members[0]; // будет только один, так как фильтруем по userId
    if (userTeamMember) {
      if (debug) console.log(`👤 User role in team: ${userTeamMember.role}`);
      
      // OPEN проекты доступны всем участникам команды
      if (teamProject.accessLevel === TeamProjectAccess.OPEN) {
        if (debug) console.log(`✅ Access granted: OPEN project, user in team`);
        return true;
      }
      
      // RESTRICTED и PRIVATE проекты доступны админам и менеджерам
      if (teamProject.accessLevel === TeamProjectAccess.RESTRICTED || teamProject.accessLevel === TeamProjectAccess.PRIVATE) {
        if (userTeamMember.role === TeamRole.ADMINISTRATOR || userTeamMember.role === TeamRole.MANAGER) {
          if (debug) console.log(`✅ Access granted: ${teamProject.accessLevel} project, user is ${userTeamMember.role}`);
          return true;
        } else {
          if (debug) console.log(`❌ Access denied: ${teamProject.accessLevel} project, user is ${userTeamMember.role} (need ADMINISTRATOR or MANAGER)`);
        }
      }
    } else {
      if (debug) console.log(`❌ User not found in team`);
    }
  }

  if (debug) console.log(`❌ Access denied: no valid access path found`);
  return false;
};
