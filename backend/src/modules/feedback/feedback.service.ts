import { env } from '@config/env';
import { isCloud } from '@config/edition';
import { logger } from '@config/logger';
import { User } from '@prisma/client';
import { prisma } from '@config/prisma';
import { CreditsServiceV3 } from '../payments/credits.service.v3';

export interface FeedbackData {
  userId: string;
  teamId: string | null;
  projectId: string | null;
  text: string;
  accountType: 'free' | 'pro' | 'team';
  subscriptionName?: string;
  stripeCustomerId?: string;
  creditsBalance?: {
    total: number;
    bonus: number;
    subscription: number;
  };
  clientVersion?: string;
}

/**
 * Определение типа аккаунта пользователя
 */
async function getUserAccountType(userId: string): Promise<{accountType: 'free' | 'pro' | 'team', subscriptionName?: string}> {
  try {
    // Проверяем активные подписки пользователя с информацией о продуктах
    const subscriptions = await prisma.stripeSubscription.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        product: true
      }
    });


    // Логика определения типа аккаунта:
    // - Если есть активные персональные подписки -> pro  
    // - Если есть участие в командах (но нет персональной подписки) -> team
    // - Иначе -> free
    
    if (subscriptions.length > 0) {
      const subscriptionName = subscriptions[0].product.name;
      return { accountType: 'pro', subscriptionName };
    }
    
    return { accountType: 'free' };
  } catch (error) {
    logger.error('Failed to determine account type', { error, userId });
    return { accountType: 'free' }; // возвращаем free по умолчанию
  }
}

/**
 * Получение информации о текущей команде пользователя
 */
async function getCurrentTeamId(userId: string): Promise<string | null> {
  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId
      },
      include: {
        team: true
      },
      orderBy: {
        joinedAt: 'desc' // берем последнюю команду
      }
    });

    return teamMember?.teamId || null;
  } catch (error) {
    logger.error('Failed to get current team', { error, userId });
    return null;
  }
}

/**
 * Отправка feedback в Slack через POST запрос
 */
async function sendSlackNotification(feedbackData: FeedbackData, user: User) {
  if (!isCloud()) return;

  const slackWebhookUrl = env.SLACK_FEEDBACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    logger.warn('Slack webhook URL not configured for feedback');
    return;
  }

  try {
    // Формируем дополнительные поля
    const additionalFields = [];
    
    // Добавляем информацию о подписке если есть
    if (feedbackData.subscriptionName) {
      additionalFields.push({
        type: 'mrkdwn',
        text: `*Subscription:* ${feedbackData.subscriptionName}`
      });
    }
    
    // Добавляем баланс кредитов если есть
    if (feedbackData.creditsBalance) {
      const { total, bonus, subscription } = feedbackData.creditsBalance;
      additionalFields.push({
        type: 'mrkdwn',
        text: `*Credits Balance:* ${total} (${subscription} subscription + ${bonus} bonus)`
      });
    }
    
    // Добавляем версию клиента если есть
    if (feedbackData.clientVersion) {
      additionalFields.push({
        type: 'mrkdwn',
        text: `*Client Version:* ${feedbackData.clientVersion}`
      });
    }
    
    // Добавляем ссылку на Stripe если есть stripeCustomerId
    if (feedbackData.stripeCustomerId) {
      additionalFields.push({
        type: 'mrkdwn',
        text: `*Stripe Profile:* <https://dashboard.stripe.com/customers/${feedbackData.stripeCustomerId}|View in Stripe>`
      });
    }

    const message = {
      text: '💬 New user feedback received',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💬 New User Feedback'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*User:* ${user.name || user.email} (${user.email})`
            },
            {
              type: 'mrkdwn',
              text: `*User ID:* ${feedbackData.userId}`
            },
            {
              type: 'mrkdwn',
              text: `*Team ID:* ${feedbackData.teamId || 'No team'}`
            },
            {
              type: 'mrkdwn',
              text: `*Project ID:* ${feedbackData.projectId || 'No project'}`
            },
            ...additionalFields
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Feedback:*\n\`\`\`${feedbackData.text}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Sent at ${new Date().toISOString()}`
            }
          ]
        }
      ]
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook responded with status ${response.status}`);
    }

    logger.info('Feedback sent to Slack', { userId: feedbackData.userId });
  } catch (error) {
    logger.error('Failed to send feedback to Slack', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: feedbackData.userId 
    });
    // Не бросаем ошибку, чтобы не блокировать процесс отправки feedback
  }
}

/**
 * Обработка и отправка feedback
 */
export async function processFeedback(userId: string, text: string, projectId?: string, clientVersion?: string) {
  try {
    // Получаем информацию о пользователе с Stripe данными
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stripeCustomer: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Определяем тип аккаунта, текущую команду и баланс кредитов
    const [accountInfo, teamId] = await Promise.all([
      getUserAccountType(userId),
      getCurrentTeamId(userId)
    ]);

    // Получаем баланс кредитов
    const creditsService = new CreditsServiceV3();
    let creditsBalance;
    try {
      creditsBalance = await creditsService.getUserCreditsBalance(userId, teamId || undefined);
    } catch (creditsError) {
      logger.warn('Failed to get credits balance for feedback', { error: creditsError, userId });
      creditsBalance = undefined;
    }

    const feedbackData: FeedbackData = {
      userId,
      teamId,
      projectId: projectId || null,
      text: text.trim(),
      accountType: accountInfo.accountType,
      subscriptionName: accountInfo.subscriptionName,
      stripeCustomerId: user.stripeCustomer?.stripeCustomerId,
      creditsBalance: {
        total: creditsBalance?.total || 0,
        bonus: creditsBalance?.team.bonus || 0,
        subscription: creditsBalance?.team.subscription || 0
      },
      clientVersion: clientVersion || undefined
    };


    try {
      await prisma.feedback.create({
        data: {
          userId,
          teamId,
          projectId,
          text: feedbackData.text,
          accountType: feedbackData.accountType,
          createdAt: new Date()
        }
      });
    } catch (dbError) {
      logger.error('Failed to save feedback to database', { error: dbError, userId });
    }

    // Отправляем в Slack
    await sendSlackNotification(feedbackData, user);

    logger.info('Feedback processed successfully', { 
      userId, 
      teamId, 
      projectId, 
      accountType: feedbackData.accountType,
      subscriptionName: feedbackData.subscriptionName,
      creditsTotal: feedbackData.creditsBalance?.total,
      textLength: text.length 
    });

  } catch (error) {
    logger.error('Failed to process feedback', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      projectId 
    });
    throw error;
  }
}
