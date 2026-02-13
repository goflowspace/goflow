import { prisma } from "@config/prisma";
import { ProjectMember } from "@prisma/client";
import { initializeDefaultEntityTypesService } from "@modules/entities/entities.service";

// Вспомогательная функция для проверки прав доступа к проекту через команду
const checkTeamAccess = async (userId: string, projectId: string, requiredRoles: string[] = ['ADMINISTRATOR', 'MANAGER']) => {
    const teamProjects = await prisma.teamProject.findMany({
        where: { projectId },
        include: {
            team: {
                include: {
                    members: {
                        where: { userId }
                    }
                }
            }
        }
    });

    for (const teamProject of teamProjects) {
        const teamMember = teamProject.team.members.find(m => m.userId === userId);
        if (teamMember && requiredRoles.includes(teamMember.role)) {
            return true;
        }
    }
    
    return false;
};

/**
 * 🔹 Создание нового проекта
 * Создатель автоматически становится `OWNER`.
 */
export const createProjectService = async (userId: string, name?: string, data?: any, skipDefaultEntities?: boolean) => {

    return prisma.$transaction(async (tx) => {
        // Создаем проект
        const project = await tx.project.create({
            data: {
                name: name || "Untitled",
                data: data ?? {},
                creatorId: userId,
                members: {
                    create: {
                        userId,
                        role: "OWNER",
                    },
                },
                projectInfo: {
                    create: {
                        status: "concept",
                        genres: [],
                        formats: []
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                },
                projectInfo: true,
            },
        });

        // Инициализируем предустановленные типы сущностей только если не используется шаблон
        if (!skipDefaultEntities) {
            try {
                await initializeDefaultEntityTypesService(project.id, tx);
            } catch (error) {
                console.error('Error initializing default entity types:', error);
                // Не прерываем создание проекта, если не удается создать типы сущностей
            }
        }

        // Создаем базовый graph snapshot (таймлайн) и инициализируем данные проекта
        try {
            const defaultSnapshot = await tx.graphSnapshot.create({
                data: {
                    projectId: project.id,
                    version: 1,
                    layers: {},
                    metadata: {},
                    variables: [],
                    timestamp: BigInt(Date.now()),
                    name: 'Main Timeline',
                    description: 'Default timeline',
                    order: 1,
                    isActive: true // Первый таймлайн должен быть активным
                }
            });
            
            // Инициализируем данные проекта с ObjectId snapshot'а
            const initialData = {
                timelines: {
                    [defaultSnapshot.id]: {
                        layers: {},
                        metadata: {},
                        lastLayerNumber: 0,
                        variables: []
                    }
                },
                projectName: project.name,
                projectId: project.id,
                _lastModified: Date.now()
            };

            // Обновляем проект с начальными данными
            await tx.project.update({
                where: { id: project.id },
                data: {
                    data: initialData
                }
            });
            
            console.log('✅ Created default graph snapshot (timeline) and initialized project data:', project.id, 'snapshot:', defaultSnapshot.id);
        } catch (error) {
            console.error('Error creating default graph snapshot for new project:', error);
            // Не прерываем создание проекта, если не удается создать snapshot
        }

        return project;
    });
};

/**
 * 🔹 Получение всех проектов, в которых участвует пользователь
 * Если передан teamId, фильтрует проекты по команде
 */
export const getUserProjectsService = async (userId: string, teamId?: string) => {
    const whereClause = {
        members: { some: { userId } },
        ...(teamId ? {
            teamProjects: { 
                some: { teamId } 
            }
        } : {})
    };
    
    const projects = await prisma.project.findMany({
        where: whereClause,
        include: {
            members: {
                include: {
                    user: { select: { id: true, email: true, name: true } },
                },
            },
            projectInfo: true, // Включаем информацию о проекте
            template: true, // Включаем информацию о шаблоне
            teamProjects: { // Включаем информацию о связях с командами
                include: {
                    team: { select: { id: true, name: true } }
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });
    
    return projects;
};

/**
 * 🔹 Обновление информации о проекте
 * Только `OWNER` или `ADMIN` могут обновлять проект.
 */
export const updateProjectService = async (userId: string, projectId: string, name: string) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) {
        throw new Error("Проект не найден");
    }

    // Проверяем прямые права на проект
    const directMember = project.members.find((m: ProjectMember) => m.userId === userId);
    const hasDirectAccess = directMember && (directMember.role === "OWNER" || directMember.role === "ADMIN");
    
    // Проверяем права через команду
    const hasTeamAccess = await checkTeamAccess(userId, projectId, ['ADMINISTRATOR', 'MANAGER']);

    if (!hasDirectAccess && !hasTeamAccess) {
        throw new Error("Нет прав на редактирование проекта");
    }

    return prisma.project.update({
        where: { id: projectId },
        data: { name },
        include: {
            members: {
                include: {
                    user: { select: { id: true, email: true, name: true } },
                },
            },
        },
    });
};

/**
 * 🔹 Удаление проекта
 * Только `OWNER` может удалить проект.
 */
export const deleteProjectService = async (userId: string, projectId: string) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) {
        throw new Error("Проект не найден");
    }

    // Проверяем прямые права на проект (владелец)
    const member = project.members.find((m: ProjectMember) => m.userId === userId);
    const isOwner = member && member.role === "OWNER";
    
    // Проверяем права через команду (только администраторы команды)
    const isTeamAdmin = await checkTeamAccess(userId, projectId, ['ADMINISTRATOR']);
    
    if (!isOwner && !isTeamAdmin) {
        throw new Error("Удалять проект может только владелец или администратор команды");
    }

    // Удаляем связанные записи перед удалением проекта
    await prisma.projectMember.deleteMany({
        where: { projectId },
    });

    return prisma.project.delete({
        where: { id: projectId },
    });
};

/**
 * 🔹 Дублирование существующего проекта
 * Создает полную копию проекта со всеми данными.
 * Только участники проекта могут его дублировать.
 */
export const duplicateProjectService = async (userId: string, projectId: string) => {
    return prisma.$transaction(async (tx) => {
        // 1. Проверяем существование проекта и права пользователя
        const project = await tx.project.findUnique({
            where: { id: projectId },
            include: { 
                members: true,
                projectVersion: {
                    select: {
                        version: true
                    }
                },
                projectInfo: true // Включаем информацию о проекте
            },
        });

        if (!project) {
            throw new Error("Проект не найден");
        }

        // Проверяем прямые права на проект (любой участник)
        const member = project.members.find((m: ProjectMember) => m.userId === userId);
        
        // Проверяем права через команду
        const hasTeamAccess = await checkTeamAccess(userId, projectId, ['ADMINISTRATOR', 'MANAGER', 'MEMBER']);
        
        if (!member && !hasTeamAccess) {
            throw new Error("Нет прав на дублирование проекта");
        }

        // 2. Создаем новый проект с данными исходного проекта
        const duplicatedProject = await tx.project.create({
            data: {
                name: `${project.name} (copy)`,
                data: project.data || {}, // Копируем все данные проекта
                creatorId: userId,
                members: {
                    create: {
                        userId,
                        role: "OWNER",
                    },
                },
                // Копируем информацию о проекте, если она есть
                projectInfo: project.projectInfo ? {
                    create: {
                        logline: project.projectInfo.logline,
                        synopsis: project.projectInfo.synopsis,
                        genres: project.projectInfo.genres,
                        formats: project.projectInfo.formats,
                        status: project.projectInfo.status,
                        setting: project.projectInfo.setting,
                        targetAudience: project.projectInfo.targetAudience,
                        mainThemes: project.projectInfo.mainThemes,
                        message: project.projectInfo.message,
                        references: project.projectInfo.references,
                        uniqueFeatures: project.projectInfo.uniqueFeatures,
                        atmosphere: project.projectInfo.atmosphere,
                        constraints: project.projectInfo.constraints
                    }
                } : {
                    create: {
                        status: "concept",
                        genres: [],
                        formats: []
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                },
                projectInfo: true, // Включаем информацию о проекте в ответ
            },
        });

        // 3. Если у оригинального проекта есть версия, создаем начальную версию для дубликата
        if (project.projectVersion) {
            await tx.projectVersion.create({
                data: {
                    projectId: duplicatedProject.id,
                    version: 0, // Начинаем с версии 0 для нового проекта
                    lastSync: new Date(),
                },
            });
        }

        // 4. Инициализируем предустановленные типы сущностей для дубликата
        try {
            await initializeDefaultEntityTypesService(duplicatedProject.id, tx);
        } catch (error) {
            console.error('Error initializing default entity types for duplicate project:', error);
            // Не прерываем дублирование проекта, если не удается создать типы сущностей
        }

        // 5. Создаем базовый graph snapshot для дублированного проекта и копируем данные
        try {
            // Получаем данные из оригинального проекта
            let originalData = {
                layers: {},
                metadata: {},
                variables: [],
                lastLayerNumber: 0
            };

            if (project.data && typeof project.data === 'object' && !Array.isArray(project.data) && 'timelines' in project.data) {
                const originalTimelines = (project.data as any).timelines as Record<string, any>;
                const originalTimelineKeys = Object.keys(originalTimelines);
                
                // Берем данные первого таймлайна из оригинального проекта
                if (originalTimelineKeys.length > 0) {
                    const firstTimelineData = originalTimelines[originalTimelineKeys[0]];
                    originalData = {
                        layers: firstTimelineData.layers || {},
                        metadata: firstTimelineData.metadata || {},
                        variables: firstTimelineData.variables || [],
                        lastLayerNumber: firstTimelineData.lastLayerNumber || 0
                    };
                }
            }

            const newSnapshot = await tx.graphSnapshot.create({
                data: {
                    projectId: duplicatedProject.id,
                    version: 1,
                    layers: originalData.layers,
                    metadata: originalData.metadata,
                    variables: originalData.variables,
                    timestamp: BigInt(Date.now()),
                    name: 'Main Timeline',
                    description: 'Default timeline (duplicated)',
                    order: 1,
                    isActive: true // Первый таймлайн должен быть активным
                }
            });

            const duplicatedData = {
                timelines: {
                    [newSnapshot.id]: originalData
                },
                projectName: duplicatedProject.name,
                projectId: duplicatedProject.id,
                _lastModified: Date.now()
            };

            // Обновляем дублированный проект с данными
            await tx.project.update({
                where: { id: duplicatedProject.id },
                data: {
                    data: duplicatedData
                }
            });
            
            console.log('✅ Created default graph snapshot and copied data for duplicated project:', duplicatedProject.id, 'snapshot:', newSnapshot.id);
        } catch (error) {
            console.error('Error creating default graph snapshot for duplicated project:', error);
            // Не прерываем дублирование проекта, если не удается создать snapshot
        }

        return duplicatedProject;
    });
};

/**
 * 🔹 Импорт данных в существующий проект
 * Полностью заменяет текущий граф импортированными данными.
 * Только `OWNER` или `ADMIN` могут импортировать в проект.
 * 
 * @param userId ID пользователя
 * @param projectId ID проекта
 * @param importData Данные для импорта
 * @param targetTimelineId ID таймлайна для импорта 
 **/
export const importToProjectService = async (userId: string, projectId: string, importData: any, targetTimelineId: string) => {
    return prisma.$transaction(async (tx) => {
        // 1. Проверяем существование проекта и права пользователя
        const project = await tx.project.findUnique({
            where: { id: projectId },
            include: { members: true },
        });

        if (!project) {
            throw new Error("Проект не найден");
        }

        // Проверяем прямые права на проект
        const member = project.members.find((m: ProjectMember) => m.userId === userId);
        const hasDirectAccess = member && (member.role === "OWNER" || member.role === "ADMIN");
        
        // Проверяем права через команду
        const hasTeamAccess = await checkTeamAccess(userId, projectId, ['ADMINISTRATOR', 'MANAGER']);
        
        if (!hasDirectAccess && !hasTeamAccess) {
            throw new Error("Нет прав на импорт в проект");
        }

        // 2. Получаем текущую версию проекта
        const currentVersion = await tx.projectVersion.findUnique({
            where: { projectId }
        });
        const nextVersion = (currentVersion?.version || 0) + 1;

        // 3. Подготавливаем данные для импорта
        let timelineData;
        let timelineName = 'Imported Timeline'; // fallback имя
        if (importData.data && importData.data.timelines) {
            // Новый формат с таймлайнами
            const timelineKeys = Object.keys(importData.data.timelines);
            const firstTimelineKey = timelineKeys[0] || 'base-timeline';
            timelineData = importData.data.timelines[firstTimelineKey];
            
            // Получаем имя таймлайна из нового поля 'name' (protocolVersion >= 4)
            if (timelineData.name) {
                timelineName = timelineData.name;
            } else if (importData.metadata?.timelineNames?.[firstTimelineKey]) {
                // Fallback для старого формата (protocolVersion 3)
                timelineName = importData.metadata.timelineNames[firstTimelineKey];
            } else {
                // Используем title проекта как fallback
                timelineName = importData.title || 'Imported Timeline';
            }
        } else {
            throw new Error("Некорректные данные для импорта");
        }

        // 4. Подготавливаем новый снапшот с сохранением существующих таймлайнов
        const timelineKey = targetTimelineId;
        
        // Получаем существующие таймлайны из проекта
        let existingTimelines = {};
        if (project.data && typeof project.data === 'object' && 'timelines' in project.data) {
            existingTimelines = (project.data as any).timelines || {};
        }

        // Создаем новый снапшот, сохраняя существующие таймлайны и заменяя/добавляя целевой
        const newSnapshot = {
            timelines: {
                ...existingTimelines,
                [timelineKey]: timelineData
            },
            projectId,
            projectName: project.name, // Сохраняем исходное название проекта
            _lastModified: Date.now()
        };

        // 5. Обновляем проект (НЕ переименовываем его)
        await tx.project.update({
            where: { id: projectId },
            data: {
                data: newSnapshot,
                updatedAt: new Date()
            }
        });

        // 6. Обновляем версию проекта
        await tx.projectVersion.upsert({
            where: { projectId },
            create: {
                projectId,
                version: nextVersion,
                lastSync: new Date()
            },
            update: {
                version: nextVersion,
                lastSync: new Date()
            }
        });

        // 7. Создаем или обновляем GraphSnapshot для целевого таймлайна
        let targetSnapshot = null;
        
        // Если передан конкретный timelineId, ищем соответствующий snapshot
        if (targetTimelineId) {
            targetSnapshot = await tx.graphSnapshot.findUnique({
                where: { id: targetTimelineId }
            });
            
            // Проверяем, что snapshot принадлежит этому проекту
            if (targetSnapshot && targetSnapshot.projectId !== projectId) {
                throw new Error("Таймлайн не принадлежит данному проекту");
            }
        } else {
            // Если timelineId не передан, ищем активный snapshot
            targetSnapshot = await tx.graphSnapshot.findFirst({
                where: { 
                    projectId,
                    isActive: true 
                }
            });
        }

        if (targetSnapshot) {
            // Обновляем существующий snapshot с новым именем из title
            await tx.graphSnapshot.update({
                where: { id: targetSnapshot.id },
                data: {
                    version: nextVersion,
                    layers: timelineData.layers || {},
                    metadata: timelineData.metadata || {},
                    variables: timelineData.variables || [],
                    timestamp: BigInt(Date.now()),
                    name: timelineName, // Используем имя таймлайна из поля name
                    updatedAt: new Date()
                }
            });
        } else {
            // Создаем новый snapshot с именем из title
            const newSnapshotData = {
                projectId,
                version: nextVersion,
                layers: timelineData.layers || {},
                metadata: timelineData.metadata || {},
                variables: timelineData.variables || [],
                timestamp: BigInt(Date.now()),
                name: timelineName, // Используем имя таймлайна из поля name
                description: 'Imported timeline',
                order: 1,
                isActive: !targetTimelineId // Только если это не конкретный таймлайн
            };

            const createdSnapshot = await tx.graphSnapshot.create({
                data: newSnapshotData
            });

            // Если мы создали новый snapshot с конкретным ID, нужно обновить ключ в timelines
            if (targetTimelineId && targetTimelineId !== createdSnapshot.id) {
                const timelineData = (newSnapshot.timelines as any)[targetTimelineId];
                if (timelineData) {
                    (newSnapshot.timelines as any)[createdSnapshot.id] = timelineData;
                    delete (newSnapshot.timelines as any)[targetTimelineId];
                }
            }
        }

        // 8. Возвращаем обновленный проект
        return tx.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                },
            },
        });
    });
};