import { prisma } from '@config/prisma';
import { stripe, STRIPE_CONFIG } from '@config/stripe';
import { env } from '@config/env';
import { AICreditType } from '@prisma/client';

export class PaymentsService {
  /**
   * Создает или получает Stripe клиента для пользователя
   */
  async getOrCreateStripeCustomer(userId: string, email: string, name?: string) {
    // Проверяем, есть ли уже клиент
    let customer = await prisma.stripeCustomer.findUnique({
      where: { userId }
    });

    if (customer) {
      return customer.stripeCustomerId;
    }

    // Создаем нового клиента в Stripe
    const stripeCustomer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId,
      },
    });

    // Сохраняем в БД
    customer = await prisma.stripeCustomer.create({
      data: {
        userId,
        stripeCustomerId: stripeCustomer.id,
      },
    });

    return customer.stripeCustomerId;
  }

  /**
   * Создает Checkout Session для подписки команды
   */
  async createSubscriptionCheckout(
    userId: string,
    priceId: string,
    teamId: string,
    seats?: number,
    successUrl?: string,
    cancelUrl?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Проверяем, что команда существует и пользователь имеет права
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: userId, // Только владелец команды может покупать подписки
      },
    });

    if (!team) {
      throw new Error('Команда не найдена или вы не являетесь её владельцем');
    }

    // Проверяем информацию о плане
    const price = await prisma.stripePrice.findFirst({
      where: { stripePriceId: priceId },
      include: { product: true },
    });

    if (!price) {
      throw new Error('Цена не найдена');
    }

    // Валидируем количество seats для Team планов
    if (price.planType === 'team') {
      if (!seats || seats < 1) {
        throw new Error('Для Team плана необходимо указать количество участников (минимум 1)');
      }
      if (price.maxSeats && seats > price.maxSeats) {
        throw new Error(`Максимальное количество участников для этого плана: ${price.maxSeats}`);
      }
    } else if (price.planType === 'pro') {
      if (seats && seats !== 1) {
        throw new Error('Pro план поддерживает только 1 участника');
      }
      seats = 1; // Принудительно устанавливаем 1 для Pro
    }

    const customerId = await this.getOrCreateStripeCustomer(userId, user.email, user.name || undefined);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: seats || 1, // Используем seats для Team планов
        },
      ],
      mode: 'subscription',
      success_url: successUrl || STRIPE_CONFIG.CHECKOUT_CONFIG.success_url,
      cancel_url: cancelUrl || STRIPE_CONFIG.CHECKOUT_CONFIG.cancel_url,
      allow_promotion_codes: STRIPE_CONFIG.CHECKOUT_CONFIG.allow_promotion_codes,
      billing_address_collection: STRIPE_CONFIG.CHECKOUT_CONFIG.billing_address_collection,
      metadata: {
        userId,
        teamId, // Передаем teamId для определения команды при обработке webhooks
        seats: seats?.toString() || '1', // Передаем количество seats
        planType: price.planType || '', // Передаем тип плана
      },
      subscription_data: {
        metadata: {
          userId, // Передаем userId в subscription metadata
          teamId, // Передаем teamId в subscription metadata
          seats: seats?.toString() || '1', // Передаем количество seats
          planType: price.planType || '', // Передаем тип плана
        },
      },
    });

    return session;
  }

  /**
   * Создает Checkout Session для разовой покупки кредитов
   */
  async createOneTimePurchaseCheckout(
    userId: string,
    priceId: string,
    successUrl?: string,
    cancelUrl?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const customerId = await this.getOrCreateStripeCustomer(userId, user.email, user.name || undefined);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || STRIPE_CONFIG.ONE_TIME_CHECKOUT_CONFIG.success_url,
      cancel_url: cancelUrl || STRIPE_CONFIG.ONE_TIME_CHECKOUT_CONFIG.cancel_url,
      metadata: {
        userId,
      },
      payment_intent_data: {
        metadata: {
          userId, // Передаем userId в payment_intent metadata
        },
      },
    });

    return session;
  }

  /**
   * Получает активные продукты и цены из Stripe
   */
  async getAvailableProducts() {
    const products = await prisma.stripeProduct.findMany({
      where: { isActive: true },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { unitAmount: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products;
  }

  /**
   * Получает подписки команды
   */
  async getTeamSubscriptions(teamId: string) {
    const subscriptions = await prisma.stripeSubscription.findMany({
      where: { 
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      include: {
        product: true,
        price: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions;
  }

  /**
   * Получает подписки пользователя (все команды где он владелец)
   */
  async getUserSubscriptions(userId: string) {
    const subscriptions = await prisma.stripeSubscription.findMany({
      where: { 
        userId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      include: {
        product: true,
        price: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions;
  }

  /**
   * Получает историю покупок пользователя
   */
  async getUserPurchases(userId: string, limit = 10) {
    const purchases = await prisma.stripePurchase.findMany({
      where: { userId },
      include: {
        product: true,
        price: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return purchases;
  }

  /**
   * Отменяет подписку (в конце периода)
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    // Проверяем, что подписка принадлежит пользователю
    const subscription = await prisma.stripeSubscription.findFirst({
      where: {
        userId,
        stripeSubscriptionId: subscriptionId,
      },
    });

    if (!subscription) {
      throw new Error('Подписка не найдена');
    }

    // Отменяем в Stripe
    const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Обновляем в БД
    await prisma.stripeSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      },
    });

    return stripeSubscription;
  }

  /**
   * Возобновляет отмененную подписку
   */
  async resumeSubscription(userId: string, subscriptionId: string) {
    const subscription = await prisma.stripeSubscription.findFirst({
      where: {
        userId,
        stripeSubscriptionId: subscriptionId,
      },
    });

    if (!subscription) {
      throw new Error('Подписка не найдена');
    }

    // Возобновляем в Stripe
    const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Обновляем в БД
    await prisma.stripeSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      },
    });

    return stripeSubscription;
  }

  /**
   * Синхронизирует продукты и цены из Stripe
   */
  async syncStripeProducts() {
    // Получаем продукты из Stripe
    const stripeProducts = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    const syncResults = [];

    for (const stripeProduct of stripeProducts.data) {
      // Получаем цены для этого продукта, чтобы определить тип
      const stripePrices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
      });

      // Определяем тип продукта по наличию recurring цен
      const hasRecurringPrices = stripePrices.data.some(price => price.recurring !== null);
      const productType = hasRecurringPrices ? 'SUBSCRIPTION' : 'ONE_TIME';

      // Ищем существующий продукт
      let product = await prisma.stripeProduct.findFirst({
        where: { stripeProductId: stripeProduct.id },
      });

      if (!product) {
        // Создаем новый продукт
        product = await prisma.stripeProduct.create({
          data: {
            stripeProductId: stripeProduct.id,
            name: stripeProduct.name,
            description: stripeProduct.description || null,
            type: productType,
          },
        });
      } else {
        // Обновляем существующий продукт
        product = await prisma.stripeProduct.update({
          where: { id: product.id },
          data: {
            name: stripeProduct.name,
            description: stripeProduct.description || null,
            type: productType,
            updatedAt: new Date(),
          },
        });
      }

      for (const stripePrice of stripePrices.data) {
        const creditsAmount = parseInt(stripeProduct.metadata?.credits || '0');
        const creditType = stripeProduct.metadata?.creditType as AICreditType || 'SUBSCRIPTION';
        
        // ИСПРАВЛЕНО: Извлекаем planType и maxSeats из метаданных
        const planType = stripeProduct.metadata?.plan_type || stripePrice.metadata?.plan_type || null;
        const maxSeats = parseInt(stripeProduct.metadata?.max_seats || stripePrice.metadata?.max_seats || '0') || null;

        console.log(`🔧 Syncing price ${stripePrice.id}: planType="${planType}", maxSeats=${maxSeats}, credits=${creditsAmount}`);

        // Ищем существующую цену
        let price = await prisma.stripePrice.findFirst({
          where: { stripePriceId: stripePrice.id },
        });

        if (!price) {
          // Создаем новую цену
          await prisma.stripePrice.create({
            data: {
              stripePriceId: stripePrice.id,
              productId: product.id,
              unitAmount: stripePrice.unit_amount || 0,
              currency: stripePrice.currency,
              interval: stripePrice.recurring?.interval || null,
              intervalCount: stripePrice.recurring?.interval_count || null,
              creditsAmount,
              creditType,
              planType,
              maxSeats,
            },
          });
        } else {
          // Обновляем существующую цену
          await prisma.stripePrice.update({
            where: { id: price.id },
            data: {
              unitAmount: stripePrice.unit_amount || 0,
              currency: stripePrice.currency,
              interval: stripePrice.recurring?.interval || null,
              intervalCount: stripePrice.recurring?.interval_count || null,
              creditsAmount,
              creditType,
              planType,
              maxSeats,
              updatedAt: new Date(),
            },
          });
        }
      }

      syncResults.push({
        productId: stripeProduct.id,
        name: stripeProduct.name,
        type: productType,
        pricesCount: stripePrices.data.length,
      });
    }

    return syncResults;
  }

  /**
   * Получает информацию о Checkout Session
   */
  async getCheckoutSession(sessionId: string) {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent'],
    });
  }

  /**
   * Получает Stripe Customer ID для пользователя
   */
  async getStripeCustomerId(userId: string): Promise<string | null> {
    const customer = await prisma.stripeCustomer.findUnique({
      where: { userId }
    });

    return customer?.stripeCustomerId || null;
  }

  /**
   * Создает сессию Customer Portal для управления подписками
   */
  async createCustomerPortalSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Получаем или создаем Stripe клиента
    const customerId = await this.getOrCreateStripeCustomer(
      userId,
      user.email,
      user.name || undefined
    );

    // Определяем return URL с fallback
    const frontendUrl = env.FRONTEND_URL;
    const returnUrl = `${frontendUrl}/billing`;

    // Создаем сессию Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * Обновляет количество занятых мест в подписке команды
   */
  async updateTeamSubscriptionSeats(teamId: string, seatsChange: number) {
    const subscription = await prisma.stripeSubscription.findFirst({
      where: {
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      include: {
        price: true,
      },
    });

    if (!subscription) {
      throw new Error('Активная подписка команды не найдена');
    }

    if (subscription.price.planType === 'pro') {
      throw new Error('Pro план не поддерживает изменение количества участников');
    }

    const newCurrentSeats = subscription.currentSeats + seatsChange;

    if (newCurrentSeats < 0) {
      throw new Error('Количество занятых мест не может быть отрицательным');
    }

    if (subscription.maxSeats && newCurrentSeats > subscription.maxSeats) {
      throw new Error(`Превышен лимит участников. Максимум: ${subscription.maxSeats}, попытка установить: ${newCurrentSeats}`);
    }

    await prisma.stripeSubscription.update({
      where: { id: subscription.id },
      data: {
        currentSeats: newCurrentSeats,
      },
    });

    return newCurrentSeats;
  }

  /**
   * Проверяет, есть ли доступные места в подписке команды
   */
  async checkTeamSeatsAvailable(teamId: string): Promise<{ available: boolean; current: number; max: number | null; planType: string | null }> {
    const subscription = await prisma.stripeSubscription.findFirst({
      where: {
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      include: {
        price: true,
      },
    });

    if (!subscription) {
      return { available: false, current: 0, max: null, planType: null };
    }

    if (subscription.price.planType === 'pro') {
      return { available: false, current: subscription.currentSeats, max: 1, planType: 'pro' };
    }

    const available = !subscription.maxSeats || subscription.currentSeats < subscription.maxSeats;
    
    return {
      available,
      current: subscription.currentSeats,
      max: subscription.maxSeats,
      planType: subscription.price.planType,
    };
  }

  /**
   * Получает активную подписку команды
   */
  async getActiveTeamSubscription(teamId: string) {
    return await prisma.stripeSubscription.findFirst({
      where: {
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      include: {
        product: true,
        price: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Получает активную персональную подписку пользователя (Pro план)
   */
  async getActiveUserSubscription(userId: string) {
    return await prisma.stripeSubscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
        price: {
          planType: 'pro',
        },
      },
      include: {
        product: true,
        price: true,
      },
    });
  }


}
