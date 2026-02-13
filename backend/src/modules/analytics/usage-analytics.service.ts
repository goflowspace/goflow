import { PrismaClient } from '@prisma/client';
import { CreditsServiceV3 } from '../payments/credits.service.v3';

const prisma = new PrismaClient();
const creditsService = new CreditsServiceV3();

export interface UsageAnalytics {
  creditsSpent: number;
  nodesCreated: number;
  charactersWritten: number;
  date: string;
  userBreakdown?: UserDayBreakdown[];
}

export interface UserDayBreakdown {
  userId: string;
  userName: string;
  creditsSpent: number;
  nodesCreated: number;
  charactersWritten: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export interface UsageAnalyticsResponse {
  analytics: UsageAnalytics[];
  teamMembers: TeamMember[];
  totalCreditsSpent: number;
  totalNodesCreated: number;
  totalCharactersWritten: number;
}

/**
 * Получить аналитику использования по дням для команды или участника
 */
export async function getUsageAnalytics(
  teamId: string,
  userId?: string,
  days: number = 30
): Promise<UsageAnalyticsResponse> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Получаем участников команды
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  const members = teamMembers.map(member => ({
    id: member.user.id,
    name: member.user.name || member.user.email,
    email: member.user.email
  }));

  // Фильтр для пользователей: конкретный или все участники команды
  const userFilter = userId ? { userId } : {
    userId: { in: teamMembers.map(member => member.user.id) }
  };

  // Получаем все транзакции через centralised credits service
  const allTransactions = await creditsService.getCreditTransactions(
    // Для команды можем использовать первого пользователя или любого
    userId || teamMembers[0]?.user.id,
    1000, // Большой лимит для получения всех транзакций за период  
    teamId
  );
  
  // Фильтруем только потраченные кредиты за указанный период
  const creditTransactions = allTransactions.filter(t => {
    const transactionUserId = t.source === 'team' 
      ? (t as any).performedBy 
      : (t as any).credits?.userId;
    
    return t.amount < 0 && 
           new Date(t.createdAt) >= startDate &&
           (!userId || transactionUserId === userId);
  });

  // Получаем операции создания узлов
  const nodeOperations = await prisma.operation.findMany({
    where: {
      ...userFilter,
      type: { in: ['node.added', 'CREATE_NODE'] },
      timestamp: { gte: BigInt(startDate.getTime()) }
    },
    select: {
      userId: true,
      timestamp: true,
      payload: true
    }
  });

  // Получаем операции обновления текста узлов
  const textOperations = await prisma.operation.findMany({
    where: {
      ...userFilter,
      type: 'node.updated',
      timestamp: { gte: BigInt(startDate.getTime()) }
    },
    select: {
      userId: true,
      timestamp: true,
      payload: true
    }
  });

  // Создаем карту дней
  const dailyStats = new Map<string, {
    creditsSpent: number;
    nodesCreated: number;
    charactersWritten: number;
  }>();

  // Инициализируем все дни
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyStats.set(dateStr, {
      creditsSpent: 0,
      nodesCreated: 0,
      charactersWritten: 0
    });
  }

  // Создаем карту пользователей по дням для детализации
  const userDailyStats = new Map<string, Map<string, {
    creditsSpent: number;
    nodesCreated: number;
    charactersWritten: number;
    userId: string;
    userName: string;
  }>>();

  // Инициализируем пользователей по дням
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    userDailyStats.set(dateStr, new Map());
    
    // Инициализируем каждого пользователя команды для этого дня
    teamMembers.forEach(member => {
      const userMap = userDailyStats.get(dateStr)!;
      userMap.set(member.user.id, {
        creditsSpent: 0,
        nodesCreated: 0,
        charactersWritten: 0,
        userId: member.user.id,
        userName: member.user.name || member.user.email
      });
    });
  }

  // Обрабатываем кредитные транзакции
  creditTransactions.forEach(transaction => {
    const date = new Date(transaction.createdAt).toISOString().split('T')[0];
    const stats = dailyStats.get(date);
    if (stats) {
      stats.creditsSpent += Math.abs(transaction.amount);
    }

    // Добавляем детализацию по пользователям
    const userStats = userDailyStats.get(date);
    const transactionUserId = transaction.source === 'team' 
      ? (transaction as any).performedBy 
      : (transaction as any).credits?.userId;
      
    if (userStats && transactionUserId) {
      const userStat = userStats.get(transactionUserId);
      if (userStat) {
        userStat.creditsSpent += Math.abs(transaction.amount);
      }
    }
  });

  // Обрабатываем создание узлов
  nodeOperations.forEach(operation => {
    const date = new Date(Number(operation.timestamp)).toISOString().split('T')[0];
    const stats = dailyStats.get(date);
    if (stats) {
      stats.nodesCreated += 1;
    }

    // Добавляем детализацию по пользователям
    const userStats = userDailyStats.get(date);
    if (userStats && operation.userId) {
      const userStat = userStats.get(operation.userId);
      if (userStat) {
        userStat.nodesCreated += 1;
      }
    }
  });

  // Обрабатываем изменения текста
  textOperations.forEach(operation => {
    const date = new Date(Number(operation.timestamp)).toISOString().split('T')[0];
    const stats = dailyStats.get(date);
    if (stats) {
      try {
        const payload = operation.payload as any;
        // Пытаемся получить текст из разных возможных структур payload
        let text = '';
        if (payload?.newData?.text) {
          text = payload.newData.text;
        } else if (payload?.newData?.title) {
          text = payload.newData.title;
        } else if (payload?.data?.text) {
          text = payload.data.text;
        } else if (payload?.text) {
          text = payload.text;
        }

        if (text && typeof text === 'string') {
          const textLength = text.length;
          stats.charactersWritten += textLength;

          // Добавляем детализацию по пользователям
          const userStats = userDailyStats.get(date);
          if (userStats && operation.userId) {
            const userStat = userStats.get(operation.userId);
            if (userStat) {
              userStat.charactersWritten += textLength;
            }
          }
        }
      } catch (error) {
        // Игнорируем ошибки парсинга payload
      }
    }
  });

  // Конвертируем в массив и сортируем по дате
  const analytics = Array.from(dailyStats.entries())
    .map(([date, stats]) => ({
      date,
      ...stats,
      // Добавляем детализацию по пользователям только если не выбран конкретный пользователь
      userBreakdown: !userId ? Array.from(userDailyStats.get(date)?.values() || [])
        .filter(user => user.creditsSpent > 0 || user.nodesCreated > 0 || user.charactersWritten > 0) : undefined
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Подсчитываем общие статистики
  const totals = analytics.reduce(
    (acc, day) => ({
      totalCreditsSpent: acc.totalCreditsSpent + day.creditsSpent,
      totalNodesCreated: acc.totalNodesCreated + day.nodesCreated,
      totalCharactersWritten: acc.totalCharactersWritten + day.charactersWritten
    }),
    { totalCreditsSpent: 0, totalNodesCreated: 0, totalCharactersWritten: 0 }
  );

  return {
    analytics,
    teamMembers: members,
    ...totals
  };
}

/**
 * Получить недавние операции для команды или участника
 */
export async function getRecentTransactions(
  teamId: string,
  userId?: string,
  limit: number = 20
) {
  // Получаем участников команды
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true }
  });

  // Используем централизованный метод получения транзакций
  const transactions = await creditsService.getCreditTransactions(
    userId || teamMembers[0]?.userId, // Используем конкретного пользователя или первого из команды
    limit,
    teamId
  );

  // Если не указан конкретный пользователь, показываем все транзакции команды
  // (CreditsServiceV3.getCreditTransactions уже фильтрует по команде)
  const filteredTransactions = transactions;

  return filteredTransactions.map(transaction => ({
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount,
    createdAt: transaction.createdAt,
    userName: (() => {
      if (transaction.source === 'team') {
        const teamTx = transaction as any;
        return teamTx.performer?.name || teamTx.performer?.email || 'Unknown';
      } else {
        const personalTx = transaction as any;
        return personalTx.credits?.user?.name || personalTx.credits?.user?.email || 'Unknown';
      }
    })()
  }));
}
