import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreditsServiceV3 } from './credits.service.v3';
import { WebhooksService } from './webhooks.service';
import { asyncHandler } from '@middlewares/asyncHandler';
import { prisma } from '@config/prisma';


const paymentsService = new PaymentsService();
const creditsService = new CreditsServiceV3();
const webhooksService = new WebhooksService();

export const getProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await paymentsService.getAvailableProducts();
  res.json({ success: true, data: products });
});

export const createSubscriptionCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { priceId, teamId, seats, successUrl, cancelUrl } = req.body;
  
  // Если teamId не передан в body, используем из middleware (текущая команда пользователя)
  const targetTeamId = teamId || req.teamId;
  
  if (!targetTeamId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Не указана команда для подписки. Передайте teamId или убедитесь, что у вас есть активная команда.' 
    });
  }

  const session = await paymentsService.createSubscriptionCheckout(
    userId,
    priceId,
    targetTeamId,
    seats,
    successUrl,
    cancelUrl
  );

  res.json({ 
    success: true, 
    data: { 
      sessionId: session.id,
      url: session.url 
    } 
  });
});

export const createOneTimePurchaseCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { priceId, successUrl, cancelUrl } = req.body;

  const session = await paymentsService.createOneTimePurchaseCheckout(
    userId,
    priceId,
    successUrl,
    cancelUrl
  );

  res.json({ 
    success: true, 
    data: { 
      sessionId: session.id,
      url: session.url 
    } 
  });
});

export const getUserSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const subscriptions = await paymentsService.getUserSubscriptions(userId);
  res.json({ success: true, data: subscriptions });
});

export const getUserPurchases = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const purchases = await paymentsService.getUserPurchases(userId, limit);
  res.json({ success: true, data: purchases });
});

export const getUserCredits = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const teamId = req.teamId;
  const balance = await creditsService.getUserCreditsBalance(userId, teamId);
  res.json({ success: true, data: balance });
});

export const getCreditTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const teamId = req.teamId;
  const limit = parseInt(req.query.limit as string) || 50;
  const transactions = await creditsService.getCreditTransactions(userId, limit, teamId);
  res.json({ success: true, data: transactions });
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { subscriptionId } = req.params;

  const result = await paymentsService.cancelSubscription(userId, subscriptionId);
  res.json({ success: true, data: result });
});

export const resumeSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { subscriptionId } = req.params;

  const result = await paymentsService.resumeSubscription(userId, subscriptionId);
  res.json({ success: true, data: result });
});

export const syncProducts = asyncHandler(async (_req: Request, res: Response) => {
  // TODO: Добавить проверку админских прав
  const results = await paymentsService.syncStripeProducts();
  res.json({ success: true, data: results });
});

export const getCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await paymentsService.getCheckoutSession(sessionId);
  res.json({ success: true, data: session });
});

/**
 * Специальный эндпоинт для Stripe webhooks (без аутентификации)
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing Stripe signature' });
  }

  // req.body должен быть raw string для webhooks
  const body = req.body;
  
  await webhooksService.handleWebhook(body, signature);
  
  res.json({ success: true });
});

export const getStripeCustomerId = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const customerId = await paymentsService.getStripeCustomerId(userId);
  
  res.json({ 
    success: true, 
    data: { 
      customerId 
    } 
  });
});

export const createCustomerPortalSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const session = await paymentsService.createCustomerPortalSession(userId);
  
  res.json({ 
    success: true, 
    data: { 
      url: session.url 
    } 
  });
});

export const getTeamSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { teamId } = req.params;
  if (!teamId) {
    return res.status(400).json({ success: false, message: 'Не указан ID команды' });
  }

  // Проверяем права доступа к команде (разрешаем всем участникам команды)
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

  if (!team) {
    return res.status(403).json({ success: false, message: 'Нет доступа к команде' });
  }

  const subscriptions = await paymentsService.getTeamSubscriptions(teamId);
  res.json({ success: true, data: subscriptions });
});

export const checkTeamSeats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { teamId } = req.params;
  if (!teamId) {
    return res.status(400).json({ success: false, message: 'Не указан ID команды' });
  }

  // Проверяем права доступа к команде
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

  if (!team) {
    return res.status(403).json({ success: false, message: 'Нет доступа к команде' });
  }

  const seatsInfo = await paymentsService.checkTeamSeatsAvailable(teamId);
  res.json({ success: true, data: seatsInfo });
});

export const getActiveTeamSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { teamId } = req.params;
  if (!teamId) {
    return res.status(400).json({ success: false, message: 'Не указан ID команды' });
  }

  // Проверяем права доступа к команде
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

  if (!team) {
    return res.status(403).json({ success: false, message: 'Нет доступа к команде' });
  }

  const subscription = await paymentsService.getActiveTeamSubscription(teamId);
  res.json({ success: true, data: subscription });
});

/**
 * Получение командных кредитов (только для админов и владельцев команды)
 */
export const getTeamCredits = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { teamId } = req.params;
  if (!teamId) {
    return res.status(400).json({ success: false, message: 'Не указан ID команды' });
  }

  // Проверяем права доступа - только админы и владельцы
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      OR: [
        { role: 'ADMINISTRATOR' },
        { role: 'MANAGER' }, // Добавляем менеджеров тоже
        { 
          team: {
            ownerId: userId
          }
        }
      ]
    },
    include: {
      team: {
        select: {
          ownerId: true,
          name: true
        }
      }
    }
  });

  if (!teamMember) {
    return res.status(403).json({ 
      success: false, 
      message: 'Нет прав для просмотра командных кредитов. Доступно только администраторам, менеджерам и владельцу команды.' 
    });
  }

  // Получаем командные кредиты
  const teamCredits = await creditsService.getTeamCreditsBalance(userId, teamId);
  
  if (!teamCredits) {
    return res.json({ 
      success: true, 
      data: null,
      message: 'У команды нет Team тарифа или командных кредитов'
    });
  }

  // Получаем дополнительную информацию о команде
  const isOnTeamPlan = await creditsService.isUserOnTeamPlan(userId, teamId);
  
  res.json({ 
    success: true, 
    data: {
      ...teamCredits,
      teamName: teamMember.team.name,
      isOnTeamPlan,
      viewerRole: teamMember.role
    }
  });
});

/**
 * Получение истории транзакций командных кредитов (только для админов и владельцев команды)
 */
export const getTeamCreditTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const { teamId } = req.params;
  if (!teamId) {
    return res.status(400).json({ success: false, message: 'Не указан ID команды' });
  }

  // Проверяем права доступа - только админы и владельцы
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      OR: [
        { role: 'ADMINISTRATOR' },
        { role: 'MANAGER' },
        { 
          team: {
            ownerId: userId
          }
        }
      ]
    },
  });

  if (!teamMember) {
    return res.status(403).json({ 
      success: false, 
      message: 'Нет прав для просмотра истории командных кредитов' 
    });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  
  // Получаем все транзакции (персональные + командные) для контекста
  const transactions = await creditsService.getCreditTransactions(userId, limit, teamId);
  
  res.json({ 
    success: true, 
    data: transactions
  });
});


