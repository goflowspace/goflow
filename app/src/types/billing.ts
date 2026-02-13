// === БИЛЛИНГ ТИПЫ ===

export interface CreditBalance {
  total: number;
  bonus: number;
  subscription: number;
}

// Командные кредиты для Team тарифов
export interface TeamCreditBalance {
  total: number;
  bonus: number;
  subscription: number;
  teamName: string;
  isOnTeamPlan: boolean;
  viewerRole: 'ADMINISTRATOR' | 'MANAGER' | 'MEMBER' | 'OBSERVER' | 'LOCALIZER';
}

// Расширенный баланс кредитов с командными кредитами
export interface ExtendedCreditBalance {
  total: number;
  personal: {bonus: number; subscription: number};
  team: {bonus: number; subscription: number};
  source: 'personal' | 'team' | 'mixed';
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'PURCHASE' | 'SUBSCRIPTION_REFILL' | 'USAGE' | 'REFUND' | 'BONUS';
  creditType: 'BONUS' | 'SUBSCRIPTION';
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface CreditTransactionsResponse {
  transactions: CreditTransaction[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

// === ПОДПИСКИ ===

export interface StripeProduct {
  id: string;
  stripeProductId: string;
  name: string;
  description?: string;
  type: 'SUBSCRIPTION' | 'ONE_TIME';
  isActive: boolean;
  prices: StripePrice[];
  createdAt: string;
  updatedAt: string;
}

export interface StripePrice {
  id: string;
  stripePriceId: string;
  productId: string;
  unitAmount: number;
  currency: string;
  interval?: 'month' | 'year';
  intervalCount?: number;
  creditsAmount: number;
  creditType: 'BONUS' | 'SUBSCRIPTION';
  // Настройки для планов подписок
  planType?: string; // "pro" или "team" для подписок
  maxSeats?: number; // Максимальное количество участников для Team планов
  isActive: boolean;
  metadata?: {
    plan_type?: string;
    billing_period?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  teamId: string; // Добавлено для командных подписок
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  productId: string;
  priceId: string;
  status: 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'PAUSED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  // Поля для управления seats в Team планах
  maxSeats?: number;
  currentSeats: number;
  product: StripeProduct;
  price: StripePrice;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  productId: string;
  priceId: string;
  amount: number;
  currency: string;
  status: 'REQUIRES_PAYMENT_METHOD' | 'REQUIRES_CONFIRMATION' | 'REQUIRES_ACTION' | 'PROCESSING' | 'REQUIRES_CAPTURE' | 'CANCELED' | 'SUCCEEDED';
  creditsGranted: number;
  creditType: 'BONUS' | 'SUBSCRIPTION';
  product: StripeProduct;
  price: StripePrice;
  createdAt: string;
  updatedAt: string;
}

// === API ОТВЕТЫ ===

export interface ProductsResponse {
  success: boolean;
  data: StripeProduct[];
}

export interface SubscriptionsResponse {
  success: boolean;
  data: Subscription[];
}

export interface PurchasesResponse {
  success: boolean;
  data: Purchase[];
}

export interface CreditsResponse {
  success: boolean;
  data: CreditBalance;
}

export interface TeamCreditsResponse {
  success: boolean;
  data: TeamCreditBalance | null;
  message?: string;
}

export interface ExtendedCreditsResponse {
  success: boolean;
  data: ExtendedCreditBalance;
}

export interface CreateCheckoutResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
}

// === ЗАПРОСЫ ===

export interface CreateCheckoutRequest {
  priceId: string;
  teamId?: string;
  seats?: number;
  successUrl?: string;
  cancelUrl?: string;
}
