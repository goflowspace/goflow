import { z } from 'zod';

// Валидация для создания Checkout Session подписки
export const createSubscriptionCheckoutSchema = z.object({
  body: z.object({
    priceId: z.string().min(1, 'priceId обязателен'),
    teamId: z.string().min(1, 'teamId обязателен для подписок команд').optional(), // Опциональный для обратной совместимости
    successUrl: z.string().url('Неверный формат URL').optional(),
    cancelUrl: z.string().url('Неверный формат URL').optional(),
  }),
});

// Валидация для создания Checkout Session разовой покупки
export const createOneTimePurchaseCheckoutSchema = z.object({
  body: z.object({
    priceId: z.string().min(1, 'priceId обязателен'),
    successUrl: z.string().url('Неверный формат URL').optional(),
    cancelUrl: z.string().url('Неверный формат URL').optional(),
  }),
});

// Валидация для получения покупок (query параметры)
export const getUserPurchasesSchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  }),
});

// Валидация для получения транзакций кредитов (query параметры)
export const getCreditTransactionsSchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  }),
});

// Валидация параметров URL
export const subscriptionIdParamSchema = z.object({
  params: z.object({
    subscriptionId: z.string().min(1, 'subscriptionId обязателен'),
  }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, 'sessionId обязателен'),
  }),
});

// Типы для TypeScript
export type CreateSubscriptionCheckoutBody = z.infer<typeof createSubscriptionCheckoutSchema>['body'];
export type CreateOneTimePurchaseCheckoutBody = z.infer<typeof createOneTimePurchaseCheckoutSchema>['body'];
export type GetUserPurchasesQuery = z.infer<typeof getUserPurchasesSchema>['query'];
export type GetCreditTransactionsQuery = z.infer<typeof getCreditTransactionsSchema>['query'];
export type SubscriptionIdParams = z.infer<typeof subscriptionIdParamSchema>['params'];
export type SessionIdParams = z.infer<typeof sessionIdParamSchema>['params'];
