import Stripe from 'stripe';
import { env } from './env';

// Ленивая инициализация Stripe клиента (не падает в OSS без ключа)
let _stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Payments are only available in Cloud edition.');
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
      typescript: true,
    });
  }
  return _stripe;
};

/** @deprecated Используй getStripe() для ленивой инициализации */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

// Константы для платежной системы
export const STRIPE_CONFIG = {
  // Валюта по умолчанию
  DEFAULT_CURRENCY: 'usd',
  
  // Соотношение кредитов к деньгам
  USD_PER_CREDIT: 0.02, // 1 кредит = 2 цента
  
  // Веб-хуки эндпоинты
  WEBHOOK_EVENTS: [
    'customer.subscription.created',
    'customer.subscription.updated', 
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
  ] as const,
  
  // Настройки Checkout
  CHECKOUT_CONFIG: {
    mode: 'subscription' as const,
    success_url: `${env.FRONTEND_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/dashboard/billing/cancel`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    payment_method_types: ['card'] as const,
  },
  
  // Настройки для разовых покупок
  ONE_TIME_CHECKOUT_CONFIG: {
    mode: 'payment' as const,
    success_url: `${env.FRONTEND_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/dashboard/billing/cancel`,
    payment_method_types: ['card'] as const,
  },
} as const;

// Типы для TypeScript
export type StripeWebhookEvent = typeof STRIPE_CONFIG.WEBHOOK_EVENTS[number];
