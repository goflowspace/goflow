import { prisma } from '@config/prisma';
import { CreditType, CreditTransactionType } from '@prisma/client';

/**
 * 💰 CreditsService с поддержкой командных кредитов для Team тарифов
 * 
 * Логика работы:
 * - Pro тариф: кредиты начисляются персонально (UserCredits)
 * - Team тариф: кредиты начисляются на команду (TeamCredits), доступны всем участникам
 */
export class CreditsServiceV3 {

  // ===== ОСНОВНЫЕ МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ БАЛАНСА =====

  /**
   * Получает баланс кредитов пользователя. Для Team планов - только командные, для остальных - персональные + командные
   */
  async getUserCreditsBalance(userId: string, teamId?: string): Promise<{
    total: number;
    personal: { bonus: number; subscription: number };
    team: { bonus: number; subscription: number };
    source: 'personal' | 'team' | 'mixed';
  }> {
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    const subscriptionType = await this.getTeamSubscriptionType(currentTeamId);
    
    if (subscriptionType === 'team') {
      // Для Team планов - проверяем доступ к ИИ
      const hasAIAccess = await this.checkTeamMemberAIAccess(currentTeamId, userId);
      
      if (!hasAIAccess) {
        // Нет доступа к ИИ - возвращаем нулевой баланс
        return {
          total: 0,
          personal: { bonus: 0, subscription: 0 },
          team: { bonus: 0, subscription: 0 },
          source: 'team',
        };
      }
      
      // Есть доступ к ИИ - возвращаем только командные кредиты
      const teamCredits = await this.getTeamCredits(currentTeamId);
      
      return {
        total: teamCredits.bonusCredits + teamCredits.subscriptionCredits,
        personal: { bonus: 0, subscription: 0 }, // Для Team планов личных кредитов нет
        team: {
          bonus: teamCredits.bonusCredits,
          subscription: teamCredits.subscriptionCredits,
        },
        source: 'team',
      };
    } else {
      // Для других планов - старая логика
      
      // Получаем персональные кредиты
      const personalCredits = await this.getPersonalCredits(userId, currentTeamId);
      
      // Получаем командные кредиты (если есть Team тариф)
      const teamCredits = await this.getTeamCredits(currentTeamId);
      
      const personalTotal = personalCredits.bonusCredits + personalCredits.subscriptionCredits;
      const teamTotal = teamCredits.bonusCredits + teamCredits.subscriptionCredits;
      
      let source: 'personal' | 'team' | 'mixed';
      if (personalTotal > 0 && teamTotal > 0) {
        source = 'mixed';
      } else if (teamTotal > 0) {
        source = 'team';
      } else {
        source = 'personal';
      }

      return {
        total: personalTotal + teamTotal,
        personal: {
          bonus: personalCredits.bonusCredits,
          subscription: personalCredits.subscriptionCredits,
        },
        team: {
          bonus: teamCredits.bonusCredits,
          subscription: teamCredits.subscriptionCredits,
        },
        source,
      };
    }
  }

  /**
   * Проверяет достаточность кредитов
   */
  async checkSufficientCredits(userId: string, amount: number, teamId?: string): Promise<boolean> {
    const balance = await this.getUserCreditsBalance(userId, teamId);
    return balance.total >= amount;
  }

  // ===== НАЧИСЛЕНИЕ КРЕДИТОВ =====

  /**
   * Добавляет кредиты - автоматически определяет куда (персональные или командные)
   */
  async addCredits(
    userId: string,
    amount: number,
    creditType: CreditType,
    transactionType: CreditTransactionType,
    description: string,
    stripePaymentIntentId?: string,
    stripeSubscriptionId?: string,
    teamId?: string
  ): Promise<void> {
    console.log(`💳 Adding credits: ${amount} ${creditType} for user ${userId}`);
    
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    // Определяем тип подписки для данной команды
    const subscriptionType = await this.getTeamSubscriptionType(currentTeamId);
    
    if (subscriptionType === 'team') {
      // Team тариф - начисляем на команду
      await this.addTeamCredits(
        currentTeamId,
        userId,
        amount,
        creditType,
        transactionType,
        description,
        stripePaymentIntentId,
        stripeSubscriptionId
      );
      console.log(`✅ Team credits added for team ${currentTeamId}: ${amount} ${creditType}`);
    } else {
      // Pro тариф или нет подписки - начисляем персонально
      await this.addPersonalCredits(
        userId,
        currentTeamId,
        amount,
        creditType,
        transactionType,
        description,
        stripePaymentIntentId,
        stripeSubscriptionId
      );
      console.log(`✅ Personal credits added for user ${userId}: ${amount} ${creditType}`);
    }
  }

  /**
   * Сбрасывает подписочные кредиты при новом периоде
   */
  async resetSubscriptionCredits(userId: string, newAmount: number, teamId?: string, planType?: string): Promise<void> {
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    // Если planType передан явно - используем его, иначе определяем через БД
    const subscriptionType = planType || await this.getTeamSubscriptionType(currentTeamId);
    
    if (subscriptionType === 'team') {
      await this.resetTeamSubscriptionCredits(currentTeamId, userId, newAmount);
      console.log(`✅ Team subscription credits reset for team ${currentTeamId}: ${newAmount}`);
    } else {
      await this.resetPersonalSubscriptionCredits(userId, currentTeamId, newAmount);
      console.log(`✅ Personal subscription credits reset for user ${userId}: ${newAmount}`);
    }
  }

  // ===== СПИСАНИЕ КРЕДИТОВ =====

  /**
   * Списывает кредиты для Team планов - только командные кредиты, для остальных - по старому приоритету
   */
  async deductCredits(
    userId: string, 
    amount: number, 
    description: string,
    requestId?: string,
    teamId?: string
  ): Promise<void> {
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    // Проверяем тип подписки команды
    const subscriptionType = await this.getTeamSubscriptionType(currentTeamId);
    
    if (subscriptionType === 'team') {
      // Для Team планов - проверяем доступ к ИИ и используем только командные кредиты
      const hasAIAccess = await this.checkTeamMemberAIAccess(currentTeamId, userId);
      
      if (!hasAIAccess) {
        throw new Error('У пользователя нет доступа к ИИ в этой команде');
      }
      
      // Получаем только командные кредиты
      const teamCredits = await this.getTeamCredits(currentTeamId);
      const totalTeamCredits = teamCredits.bonusCredits + teamCredits.subscriptionCredits;
      
      if (totalTeamCredits < amount) {
        throw new Error('Недостаточно командных кредитов');
      }

      let remaining = amount;
      
      // Приоритет для Team планов: только командные кредиты (бонусные → подписочные)
      
      // 1. Командные бонусные кредиты
      if (remaining > 0 && teamCredits.bonusCredits > 0) {
        const toDeduct = Math.min(remaining, teamCredits.bonusCredits);
        await this.deductTeamCredits(currentTeamId, userId, toDeduct, CreditType.BONUS, `${description} (team bonus)`, requestId);
        remaining -= toDeduct;
      }
      
      // 2. Командные подписочные кредиты
      if (remaining > 0 && teamCredits.subscriptionCredits > 0) {
        const toDeduct = Math.min(remaining, teamCredits.subscriptionCredits);
        await this.deductTeamCredits(currentTeamId, userId, toDeduct, CreditType.SUBSCRIPTION, `${description} (team subscription)`, requestId);
        remaining -= toDeduct;
      }
    } else {
      // Для других типов команд (free, pro) - старая логика со смешанными кредитами
      
      // Получаем все доступные кредиты
      const personalCredits = await this.getPersonalCredits(userId, currentTeamId);
      const teamCredits = await this.getTeamCredits(currentTeamId);
      
      const totalAvailable = 
        personalCredits.bonusCredits + 
        personalCredits.subscriptionCredits +
        teamCredits.bonusCredits + 
        teamCredits.subscriptionCredits;
      
      if (totalAvailable < amount) {
        throw new Error('Insufficient credits');
      }

      let remaining = amount;
      
      // Приоритет списания: Team Bonus → Personal Bonus → Team Subscription → Personal Subscription
      
      // 1. Командные бонусные кредиты
      if (remaining > 0 && teamCredits.bonusCredits > 0) {
        const toDeduct = Math.min(remaining, teamCredits.bonusCredits);
        await this.deductTeamCredits(currentTeamId, userId, toDeduct, CreditType.BONUS, `${description} (team bonus)`, requestId);
        remaining -= toDeduct;
      }
      
      // 2. Персональные бонусные кредиты
      if (remaining > 0 && personalCredits.bonusCredits > 0) {
        const toDeduct = Math.min(remaining, personalCredits.bonusCredits);
        await this.deductPersonalCredits(userId, currentTeamId, toDeduct, CreditType.BONUS, `${description} (personal bonus)`, requestId);
        remaining -= toDeduct;
      }
      
      // 3. Командные подписочные кредиты
      if (remaining > 0 && teamCredits.subscriptionCredits > 0) {
        const toDeduct = Math.min(remaining, teamCredits.subscriptionCredits);
        await this.deductTeamCredits(currentTeamId, userId, toDeduct, CreditType.SUBSCRIPTION, `${description} (team subscription)`, requestId);
        remaining -= toDeduct;
      }
      
      // 4. Персональные подписочные кредиты
      if (remaining > 0 && personalCredits.subscriptionCredits > 0) {
        const toDeduct = Math.min(remaining, personalCredits.subscriptionCredits);
        await this.deductPersonalCredits(userId, currentTeamId, toDeduct, CreditType.SUBSCRIPTION, `${description} (personal subscription)`, requestId);
        remaining -= toDeduct;
      }
    }

    // Обновляем статистику использования
    await this.updateUsageStats(userId, amount, currentTeamId);
  }

  // ===== ПРИВАТНЫЕ МЕТОДЫ ДЛЯ ПЕРСОНАЛЬНЫХ КРЕДИТОВ =====

  private async getPersonalCredits(userId: string, teamId: string) {
    let credits = await prisma.userCredits.findFirst({
      where: { userId, teamId },
    });

    if (!credits) {
      credits = await prisma.userCredits.create({
        data: {
          userId,
          teamId,
          bonusCredits: 500, // Начальные бонусные кредиты
        },
      });
    }

    return credits;
  }

  private async addPersonalCredits(
    userId: string,
    teamId: string,
    amount: number,
    creditType: CreditType,
    transactionType: CreditTransactionType,
    description: string,
    stripePaymentIntentId?: string,
    stripeSubscriptionId?: string
  ): Promise<void> {
    const credits = await this.getPersonalCredits(userId, teamId);

    const updateData: any = {};
    switch (creditType) {
      case CreditType.BONUS:
        updateData.bonusCredits = { increment: amount };
        break;
      case CreditType.SUBSCRIPTION:
        updateData.subscriptionCredits = { increment: amount };
        break;
    }

    await prisma.userCredits.update({
      where: { id: credits.id },
      data: updateData,
    });
    
    await prisma.creditTransaction.create({
      data: {
        creditsId: credits.id,
        type: transactionType,
        creditType,
        amount,
        description,
        requestId: null,
        stripePaymentIntentId,
        stripeSubscriptionId,
      },
    });
  }

  private async deductPersonalCredits(
    userId: string,
    teamId: string,
    amount: number,
    creditType: CreditType,
    description: string,
    requestId?: string
  ): Promise<void> {
    const credits = await this.getPersonalCredits(userId, teamId);

    const updateData: any = {};
    switch (creditType) {
      case CreditType.BONUS:
        updateData.bonusCredits = { decrement: amount };
        break;
      case CreditType.SUBSCRIPTION:
        updateData.subscriptionCredits = { decrement: amount };
        break;
    }

    await prisma.userCredits.update({
      where: { id: credits.id },
      data: updateData,
    });

    await prisma.creditTransaction.create({
      data: {
        creditsId: credits.id,
        type: CreditTransactionType.USAGE,
        creditType,
        amount: -amount,
        description,
        requestId,
      },
    });
  }

  private async resetPersonalSubscriptionCredits(userId: string, teamId: string, newAmount: number): Promise<void> {
    const credits = await this.getPersonalCredits(userId, teamId);

    if (credits.subscriptionCredits > 0) {
      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.id,
          type: CreditTransactionType.SUBSCRIPTION_RESET,
          creditType: CreditType.SUBSCRIPTION,
          amount: -credits.subscriptionCredits,
          description: 'Reset unused subscription credits',
        },
      });
    }

    await prisma.userCredits.update({
      where: { id: credits.id },
      data: { subscriptionCredits: newAmount },
    });

    if (newAmount > 0) {
      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.id,
          type: CreditTransactionType.MONTHLY_REFILL,
          creditType: CreditType.SUBSCRIPTION,
          amount: newAmount,
          description: 'Personal subscription credits refill',
        },
      });
    }

    await this.resetUsageStats(userId, teamId);
  }

  // ===== ПРИВАТНЫЕ МЕТОДЫ ДЛЯ КОМАНДНЫХ КРЕДИТОВ =====

  private async getTeamCredits(teamId: string) {
    const teamCredits = await prisma.teamCredits.findUnique({
      where: { teamId },
    });

    return teamCredits || { bonusCredits: 0, subscriptionCredits: 0 };
  }

  private async addTeamCredits(
    teamId: string,
    purchasedBy: string,
    amount: number,
    creditType: CreditType,
    transactionType: CreditTransactionType,
    description: string,
    stripePaymentIntentId?: string,
    stripeSubscriptionId?: string
  ): Promise<void> {
    // Получаем или создаем запись командных кредитов
    let teamCredits = await prisma.teamCredits.findUnique({
      where: { teamId },
    });

    if (!teamCredits) {
      teamCredits = await prisma.teamCredits.create({
        data: {
          teamId,
          purchasedBy,
          lastSubscriptionId: stripeSubscriptionId || null,
        },
      });
    }

    const updateData: any = {};
    switch (creditType) {
      case CreditType.BONUS:
        updateData.bonusCredits = { increment: amount };
        break;
      case CreditType.SUBSCRIPTION:
        updateData.subscriptionCredits = { increment: amount };
        updateData.lastSubscriptionId = stripeSubscriptionId || teamCredits.lastSubscriptionId;
        break;
    }

    await prisma.teamCredits.update({
      where: { id: teamCredits.id },
      data: updateData,
    });

    await prisma.teamCreditTransaction.create({
      data: {
        teamCreditsId: teamCredits.id,
        type: transactionType,
        creditType,
        amount,
        description,
        performedBy: purchasedBy,
        stripePaymentIntentId,
        stripeSubscriptionId,
      },
    });
  }

  private async deductTeamCredits(
    teamId: string,
    performedBy: string,
    amount: number,
    creditType: CreditType,
    description: string,
    requestId?: string
  ): Promise<void> {
    const teamCredits = await prisma.teamCredits.findUnique({
      where: { teamId },
    });

    if (!teamCredits) {
      throw new Error('Team credits not found');
    }

    const updateData: any = {};
    switch (creditType) {
      case CreditType.BONUS:
        updateData.bonusCredits = { decrement: amount };
        break;
      case CreditType.SUBSCRIPTION:
        updateData.subscriptionCredits = { decrement: amount };
        break;
    }

    await prisma.teamCredits.update({
      where: { id: teamCredits.id },
      data: updateData,
    });

    await prisma.teamCreditTransaction.create({
      data: {
        teamCreditsId: teamCredits.id,
        type: CreditTransactionType.USAGE,
        creditType,
        amount: -amount,
        description,
        performedBy,
        requestId,
      },
    });
  }

  private async resetTeamSubscriptionCredits(teamId: string, purchasedBy: string, newAmount: number): Promise<void> {
    let teamCredits = await prisma.teamCredits.findUnique({
      where: { teamId },
    });

    if (!teamCredits) {
      if (newAmount > 0) {
        teamCredits = await prisma.teamCredits.create({
          data: {
            teamId,
            purchasedBy,
            subscriptionCredits: newAmount,
          },
        });
      }
      return;
    }

    if (teamCredits.subscriptionCredits > 0) {
      await prisma.teamCreditTransaction.create({
        data: {
          teamCreditsId: teamCredits.id,
          type: CreditTransactionType.SUBSCRIPTION_RESET,
          creditType: CreditType.SUBSCRIPTION,
          amount: -teamCredits.subscriptionCredits,
          description: 'Reset unused team subscription credits',
          performedBy: purchasedBy,
        },
      });
    }

    await prisma.teamCredits.update({
      where: { id: teamCredits.id },
      data: { subscriptionCredits: newAmount },
    });

    if (newAmount > 0) {
      await prisma.teamCreditTransaction.create({
        data: {
          teamCreditsId: teamCredits.id,
          type: CreditTransactionType.MONTHLY_REFILL,
          creditType: CreditType.SUBSCRIPTION,
          amount: newAmount,
          description: 'Team subscription credits refill',
          performedBy: purchasedBy,
        },
      });
    }

    // Сбрасываем командную статистику
    await this.resetTeamUsageStats(teamId);
  }

  // ===== МЕТОДЫ ДЛЯ ОПРЕДЕЛЕНИЯ ТИПА ПОДПИСКИ =====

  /**
   * Определяет тип подписки команды (pro/team)
   */
  async getTeamSubscriptionType(teamId: string): Promise<'pro' | 'team' | null> {
    const activeSubscription = await prisma.stripeSubscription.findFirst({
      where: {
        teamId,
        status: 'ACTIVE',
      },
      include: {
        price: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeSubscription?.price?.planType) {
      return null;
    }

    return activeSubscription.price.planType as 'pro' | 'team';
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  /**
   * Получает историю транзакций (для Team планов - только командные, для остальных - только персональные)
   */
  async getCreditTransactions(userId: string, limit = 50, teamId?: string) {
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    // Определяем тип подписки
    const subscriptionType = await this.getTeamSubscriptionType(currentTeamId);
    
    if (subscriptionType === 'team') {
      // Для Team планов показываем только командные транзакции
      const teamTransactions = await prisma.teamCreditTransaction.findMany({
        where: {
          teamCredits: { teamId: currentTeamId },
        },
        include: {
          performer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return teamTransactions.map(t => ({ ...t, source: 'team' as const }));
    } else {
      // Для Pro планов и без подписки показываем только персональные транзакции
      const personalCredits = await this.getPersonalCredits(userId, currentTeamId);
      const personalTransactions = await prisma.creditTransaction.findMany({
        where: { creditsId: personalCredits.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return personalTransactions.map(t => ({ ...t, source: 'personal' as const }));
    }
  }

  private async getCurrentTeamId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        teamMemberships: { 
          include: { team: true }
        }
      }
    });

    if (!user || user.teamMemberships.length === 0) {
      throw new Error('Пользователь не найден или не состоит в команде');
    }

    return user.teamMemberships[0].teamId;
  }

  private async updateUsageStats(userId: string, amount: number, teamId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Обновляем персональную дневную статистику
    let dailyStats = await prisma.usageStats.findFirst({
      where: { userId, teamId, period: 'DAILY' },
    });

    if (!dailyStats) {
      await prisma.usageStats.create({
        data: {
          userId,
          teamId,
          period: 'DAILY',
          used: amount,
          resetDate: tomorrow,
        },
      });
    } else {
      await prisma.usageStats.update({
        where: { id: dailyStats.id },
        data: { used: { increment: amount } },
      });
    }

    // Обновляем командную статистику
    await this.updateTeamUsageStats(teamId, userId, amount);
  }

  private async updateTeamUsageStats(teamId: string, userId: string, amount: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let teamStats = await prisma.teamUsageStats.findFirst({
      where: { teamId, period: 'DAILY' },
    });

    if (!teamStats) {
      await prisma.teamUsageStats.create({
        data: {
          teamId,
          period: 'DAILY',
          used: amount,
          usedBy: { [userId]: amount },
          resetDate: tomorrow,
        },
      });
    } else {
      const usedBy = teamStats.usedBy as Record<string, number>;
      usedBy[userId] = (usedBy[userId] || 0) + amount;

      await prisma.teamUsageStats.update({
        where: { id: teamStats.id },
        data: { 
          used: { increment: amount },
          usedBy: usedBy,
        },
      });
    }
  }

  private async resetUsageStats(userId: string, teamId: string): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    let monthlyStats = await prisma.usageStats.findFirst({
      where: { userId, teamId, period: 'MONTHLY' },
    });

    if (!monthlyStats) {
      await prisma.usageStats.create({
        data: {
          userId,
          teamId,
          period: 'MONTHLY',
          used: 0,
          resetDate: nextMonth,
        },
      });
    } else {
      await prisma.usageStats.update({
        where: { id: monthlyStats.id },
        data: { used: 0, resetDate: nextMonth },
      });
    }
  }

  private async resetTeamUsageStats(teamId: string): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    let monthlyStats = await prisma.teamUsageStats.findFirst({
      where: { teamId, period: 'MONTHLY' },
    });

    if (!monthlyStats) {
      await prisma.teamUsageStats.create({
        data: {
          teamId,
          period: 'MONTHLY',
          used: 0,
          usedBy: {},
          resetDate: nextMonth,
        },
      });
    } else {
      await prisma.teamUsageStats.update({
        where: { id: monthlyStats.id },
        data: { 
          used: 0, 
          usedBy: {},
          resetDate: nextMonth,
        },
      });
    }
  }

  // ===== МЕТОДЫ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ =====

  /**
   * Проверяет, является ли пользователь участником Team тарифа
   */
  async isUserOnTeamPlan(userId: string, teamId?: string): Promise<boolean> {
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    const subscriptionType = await this.getTeamSubscriptionType(currentTeamId);
    return subscriptionType === 'team';
  }

  /**
   * Проверяет доступ к ИИ для участника команды
   */
  private async checkTeamMemberAIAccess(teamId: string, userId: string): Promise<boolean> {
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
  }

  /**
   * Получает командные кредиты для отображения в UI (только если пользователь в Team тарифе)
   */
  async getTeamCreditsBalance(userId: string, teamId?: string): Promise<{
    total: number;
    bonus: number;
    subscription: number;
  } | null> {
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    if (!(await this.isUserOnTeamPlan(userId, currentTeamId))) {
      return null;
    }

    const teamCredits = await this.getTeamCredits(currentTeamId);
    
    return {
      total: teamCredits.bonusCredits + teamCredits.subscriptionCredits,
      bonus: teamCredits.bonusCredits,
      subscription: teamCredits.subscriptionCredits,
    };
  }
}
