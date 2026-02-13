import { prisma } from '@config/prisma';
import { CreditType, CreditTransactionType } from '@prisma/client';

/**
 * 💰 Новый CreditsService с чистой архитектурой (SRP принцип)
 */
export class CreditsServiceV2 {
  /**
   * Получает баланс кредитов пользователя
   */
  async getUserCreditsBalance(userId: string, teamId?: string): Promise<{
    total: number;
    bonus: number;
    subscription: number;
  }> {
    // Получаем текущую команду пользователя
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

    // Используем переданный teamId или первую команду пользователя
    const currentTeamId = teamId || user.teamMemberships[0].teamId;
    // Получаем или создаем запись баланса для команды
    let credits = await prisma.userCredits.findFirst({
      where: { userId, teamId: currentTeamId },
    });

    if (!credits) {
      credits = await prisma.userCredits.create({
        data: {
          userId,
          teamId: currentTeamId,
          bonusCredits: 500, // Начисляем 500 бонусных кредитов при первом обращении
        },
      });
    }

    const total = credits.bonusCredits + credits.subscriptionCredits;

    return {
      total,
      bonus: credits.bonusCredits,
      subscription: credits.subscriptionCredits,
    };
  }

  /**
   * Добавляет кредиты определенного типа
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
    
    // Получаем команду если не передана
    const targetTeamId = teamId || await this.getCurrentTeamId(userId);
    
    // Получаем/создаем запись баланса
    let credits = await prisma.userCredits.findFirst({
      where: { userId, teamId: targetTeamId },
    });

    if (!credits) {
      credits = await prisma.userCredits.create({
        data: { 
          userId,
          teamId: targetTeamId
        },
      });
    }

    console.log(`✅ Found/created credits record: ${credits.id}`);

    // Обновляем баланс соответствующего типа кредитов
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
    
    // Создаем транзакцию
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

    console.log(`✅ Credits successfully added: ${amount} ${creditType}`);
  }

  /**
   * Проверяет достаточность кредитов
   */
  async checkSufficientCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getUserCreditsBalance(userId);
    
    // TODO: Implement daily limit check (if needed)

    return balance.total >= amount;
  }

  /**
   * Списывает кредиты по приоритету: бонусные → стартовые → подписочные
   */
  async deductCredits(
    userId: string, 
    amount: number, 
    description: string,
    requestId?: string,
    teamId?: string
  ): Promise<void> {
    // Получаем команду
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    const credits = await prisma.userCredits.findFirst({
      where: { userId, teamId: currentTeamId },
    });

    if (!credits) {
      throw new Error('User credits not found');
    }

    // Проверяем достаточность кредитов
    const totalAvailable = credits.bonusCredits + credits.subscriptionCredits;
    if (totalAvailable < amount) {
      throw new Error('Insufficient credits');
    }

    let remaining = amount;
    const transactions = [];

    // 1. Сначала тратим бонусные кредиты
    if (remaining > 0 && credits.bonusCredits > 0) {
      const bonusToUse = Math.min(remaining, credits.bonusCredits);
      remaining -= bonusToUse;

      transactions.push({
        creditsId: credits.id,
        type: CreditTransactionType.USAGE,
        creditType: CreditType.BONUS,
        amount: -bonusToUse,
        description: `${description} (bonus)`,
        requestId,
      });

      await prisma.userCredits.update({
        where: { id: credits.id },
        data: { bonusCredits: { decrement: bonusToUse } },
      });
    }

    // 2. Затем подписочные кредиты
    if (remaining > 0 && credits.subscriptionCredits > 0) {
      const subscriptionToUse = Math.min(remaining, credits.subscriptionCredits);
      remaining -= subscriptionToUse;

      transactions.push({
        creditsId: credits.id,
        type: CreditTransactionType.USAGE,
        creditType: CreditType.SUBSCRIPTION,
        amount: -subscriptionToUse,
        description: `${description} (подписочные)`,
        requestId,
      });

      await prisma.userCredits.update({
        where: { id: credits.id },
        data: { subscriptionCredits: { decrement: subscriptionToUse } },
      });
    }

    // Создаем транзакции
    await prisma.creditTransaction.createMany({
      data: transactions,
    });

    // Обновляем статистику использования
    await this.updateUsageStats(userId, amount, currentTeamId);
  }

  /**
   * Получает историю транзакций пользователя
   */
  async getCreditTransactions(userId: string, limit = 50, teamId?: string) {
    // Получаем команду
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    const credits = await prisma.userCredits.findFirst({
      where: { userId, teamId: currentTeamId },
    });

    if (!credits) {
      return [];
    }

    return await prisma.creditTransaction.findMany({
      where: { creditsId: credits.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Сбрасывает подписочные кредиты при новом периоде
   */
  async resetSubscriptionCredits(userId: string, newAmount: number, teamId?: string): Promise<void> {
    // Получаем команду
    const currentTeamId = teamId || await this.getCurrentTeamId(userId);
    
    const credits = await prisma.userCredits.findFirst({
      where: { userId, teamId: currentTeamId },
    });

    if (!credits) return;

    // Если есть неиспользованные подписочные кредиты, создаем транзакцию сброса
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

    // Устанавливаем новое количество подписочных кредитов
    await prisma.userCredits.update({
      where: { id: credits.id },
      data: {
        subscriptionCredits: newAmount,
      },
    });

    // Создаем транзакцию пополнения
    if (newAmount > 0) {
      await prisma.creditTransaction.create({
        data: {
          creditsId: credits.id,
          type: CreditTransactionType.MONTHLY_REFILL,
          creditType: CreditType.SUBSCRIPTION,
          amount: newAmount,
          description: 'Subscription credits refill',
        },
      });
    }

    // Сбрасываем статистику использования
    await this.resetUsageStats(userId, currentTeamId);
  }

  // === ПРИВАТНЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ЛИМИТАМИ И СТАТИСТИКОЙ ===

  // TODO: Implement daily limits functionality

  private async updateUsageStats(userId: string, amount: number, teamId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Обновляем дневную статистику
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
  }

  private async resetUsageStats(userId: string, teamId: string): Promise<void> {
    // Сбрасываем месячную статистику
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

  // === ПРИВАТНЫЕ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

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

    // Возвращаем ID первой команды
    return user.teamMemberships[0].teamId;
  }
}
