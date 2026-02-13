import { prisma } from "@config/prisma";
import { logger } from "@config/logger";
import { env } from "@config/env";
import { isCloud } from "@config/edition";

interface SalesRequestData {
  userId: string;
  userName: string;
  userEmail: string;
  stripeCustomerId?: string;
  source: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
    membersCount: number;
    isOwner: boolean;
  }>;
  activeSubscriptions: Array<{
    id: string;
    productName: string;
    status: string;
    amount: number;
    currency: string;
    interval: string;
  }>;
  totalCreditsBalance: number;
  creditsBreakdown: {
    subscription: number;
    bonus: number;
  };
}

/**
 * Отправка sales запроса в Slack
 */
async function sendSalesSlackNotification(salesData: SalesRequestData) {
  if (!isCloud()) return;

  const slackWebhookUrl = env.SLACK_SALES_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    logger.warn('Slack sales webhook URL not configured');
    return;
  }

  try {
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚀 Enterprise Plan Request"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*User:* ${salesData.userName} (${salesData.userEmail})`
            },
            {
              type: "mrkdwn",
              text: `*User ID:* ${salesData.userId}`
            },
            {
              type: "mrkdwn",
              text: `*Source:* ${salesData.source}`
            }
          ]
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: salesData.teams.length === 1 ? "*Current Team Information:*" : "*All Team Information:*"
          }
        }
      ]
    };

    // Добавляем информацию о командах
    if (salesData.teams.length > 0) {
      salesData.teams.forEach((team, index) => {
        message.blocks.push({
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Team ${index + 1}:* ${team.name} (${team.membersCount} members, ${team.role})`
            },
            {
              type: "mrkdwn",
              text: `*Team ID:* \`${team.id}\``
            }
          ]
        });
      });
    } else {
      message.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No team memberships found"
        }
      });
    }

    // Добавляем информацию о подписках
    message.blocks.push({
      type: "divider"
    });
    message.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Current Subscriptions:*"
      }
    });

    if (salesData.activeSubscriptions.length > 0) {
      salesData.activeSubscriptions.forEach((subscription, index) => {
        const amount = (subscription.amount / 100).toFixed(2);
        message.blocks.push({
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Plan ${index + 1}:* ${subscription.productName}`
            },
            {
              type: "mrkdwn", 
              text: `*Status:* ${subscription.status}`
            },
            {
              type: "mrkdwn",
              text: `*Price:* $${amount} ${subscription.currency.toUpperCase()}/${subscription.interval}`
            },
            {
              type: "mrkdwn",
              text: `*Subscription ID:* ${subscription.id}`
            }
          ]
        });
      });
    } else {
      message.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No active subscriptions"
        }
      });
    }

    // Добавляем информацию о кредитах
    message.blocks.push({
      type: "divider"
    });
    message.blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Total Credits:* ${salesData.totalCreditsBalance.toLocaleString()}`
        },
        {
          type: "mrkdwn",
          text: `*Subscription Credits:* ${salesData.creditsBreakdown.subscription.toLocaleString()}`
        },
        {
          type: "mrkdwn",
          text: `*Bonus Credits:* ${salesData.creditsBreakdown.bonus.toLocaleString()}`
        }
      ]
    });

    // Добавляем Stripe ссылку если есть
    if (salesData.stripeCustomerId) {
      message.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Stripe Profile:* <https://dashboard.stripe.com/customers/${salesData.stripeCustomerId}|View in Stripe Dashboard>`
        }
      });
    }

    // Добавляем призыв к действию
    message.blocks.push({
      type: "divider"
    });
    message.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎯 *Next Steps:* Contact this user to discuss Enterprise plan benefits and pricing. ${env.SLACK_SALES_MANAGER_ID ? ` ${env.SLACK_SALES_MANAGER_ID.split(',').map(id => `<@${id.trim()}>`).join(' ')}` : ''}`
      }
    });

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook responded with status ${response.status}`);
    }

    logger.info('Sales request sent to Slack', { userId: salesData.userId });
  } catch (error) {
    logger.error('Failed to send sales request to Slack', { 
      userId: salesData.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Сбор данных пользователя и отправка sales запроса
 */
export async function sendSalesRequest(userId: string, source: string = 'unknown', targetTeamId?: string): Promise<void> {
  try {
    // Получаем данные пользователя со всеми связями
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stripeCustomer: true,
        stripeSubscriptions: {
          where: {
            status: {
              in: ['ACTIVE', 'TRIALING']
            }
          },
          include: {
            product: true,
            price: true
          }
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                members: true,
                owner: true
              }
            }
          }
        },
        ownedTeams: {
          include: {
            members: true
          }
        },
        credits: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Собираем информацию о командах
    const teams = [];
    
    if (targetTeamId) {
      // Если указан конкретный teamId, ищем только эту команду
      
      // Проверяем среди команд где пользователь владелец
      const ownedTeam = user.ownedTeams.find(team => team.id === targetTeamId);
      if (ownedTeam) {
        teams.push({
          id: ownedTeam.id,
          name: ownedTeam.name,
          role: 'OWNER',
          membersCount: ownedTeam.members.length,
          isOwner: true
        });
      }
      
      // Проверяем среди команд где пользователь участник
      const membership = user.teamMemberships.find(m => m.team.id === targetTeamId);
      if (membership) {
        teams.push({
          id: membership.team.id,
          name: membership.team.name,
          role: membership.role,
          membersCount: membership.team.members.length,
          isOwner: false
        });
      }
    }

    // Собираем информацию о подписках
    const activeSubscriptions = user.stripeSubscriptions.map((subscription: any) => ({
      id: subscription.stripeSubscriptionId,
      productName: subscription.product.name,
      status: subscription.status,
      amount: subscription.price.unitAmount,
      currency: subscription.price.currency,
      interval: subscription.price.interval || 'one-time'
    }));

    // Подсчитываем кредиты
    const totalCredits = user.credits.reduce((total: number, credit: any) => total + credit.bonusCredits + credit.subscriptionCredits, 0);
    const subscriptionCredits = user.credits.reduce((total: number, credit: any) => total + credit.subscriptionCredits, 0);
    const bonusCredits = user.credits.reduce((total: number, credit: any) => total + credit.bonusCredits, 0);

    const salesData: SalesRequestData = {
      userId: user.id,
      userName: user.name || 'Unknown',
      userEmail: user.email,
      stripeCustomerId: user.stripeCustomer?.stripeCustomerId,
      source,
      teams,
      activeSubscriptions,
      totalCreditsBalance: totalCredits,
      creditsBreakdown: {
        subscription: subscriptionCredits,
        bonus: bonusCredits
      }
    };

    await sendSalesSlackNotification(salesData);
    
    logger.info('Sales request processed successfully', { userId });
  } catch (error) {
    logger.error('Failed to process sales request', { 
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
