import { Router } from 'express';
import { authenticateJWT } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import {
  getProducts,
  createSubscriptionCheckout,
  createOneTimePurchaseCheckout,
  getUserSubscriptions,
  getUserPurchases,
  getUserCredits,
  getCreditTransactions,
  cancelSubscription,
  resumeSubscription,
  syncProducts,
  getCheckoutSession,
  handleWebhook,
  getStripeCustomerId,
  createCustomerPortalSession,
  getTeamSubscriptions,
  checkTeamSeats,
  getActiveTeamSubscription,
  getTeamCredits,
  getTeamCreditTransactions,
} from './payments.controller';
import {
  createSubscriptionCheckoutSchema,
  createOneTimePurchaseCheckoutSchema,
  getUserPurchasesSchema,
  getCreditTransactionsSchema,
  subscriptionIdParamSchema,
  sessionIdParamSchema,
} from './payments.validation';

const router = Router();

// Публичные роуты
router.get('/products', getProducts);
router.get('/checkout/session/:sessionId', 
  validate(sessionIdParamSchema),
  getCheckoutSession
);

// Административные роуты
// FIXME: remove this route after testing
router.post('/admin/sync-products', syncProducts);

// Webhook роут (БЕЗ аутентификации, так как приходит от Stripe)
router.post('/webhooks/stripe', handleWebhook);

// Защищенные роуты (требуют аутентификации)
router.use(authenticateJWT);

// Создание Checkout Sessions
router.post('/checkout/subscription', 
  validate(createSubscriptionCheckoutSchema),
  createSubscriptionCheckout
);

router.post('/checkout/purchase',
  validate(createOneTimePurchaseCheckoutSchema),
  createOneTimePurchaseCheckout
);

// Информация о пользователе
router.get('/subscriptions', getUserSubscriptions);
router.get('/purchases', 
  validate(getUserPurchasesSchema),
  getUserPurchases
);

// Кредиты
router.get('/credits', getUserCredits);
router.get('/credits/transactions',
  validate(getCreditTransactionsSchema),
  getCreditTransactions
);

// Stripe Customer ID
router.get('/customer-id', getStripeCustomerId);

// Customer Portal
router.post('/customer-portal', createCustomerPortalSession);

// Управление подписками
router.post('/subscriptions/:subscriptionId/cancel',
  validate(subscriptionIdParamSchema),
  cancelSubscription
);

router.post('/subscriptions/:subscriptionId/resume',
  validate(subscriptionIdParamSchema),
  resumeSubscription
);

// Team subscriptions endpoints
router.get('/teams/:teamId/subscriptions', getTeamSubscriptions);
router.get('/teams/:teamId/seats', checkTeamSeats);
router.get('/teams/:teamId/subscription', getActiveTeamSubscription);

// Team credits endpoints (only for admins/managers/owners)
router.get('/teams/:teamId/credits', getTeamCredits);
router.get('/teams/:teamId/credits/transactions', getTeamCreditTransactions);

export { router as paymentsRoutes };
