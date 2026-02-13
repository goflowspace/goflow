import { stripe } from '@config/stripe';
import { env } from '@config/env';
import { prisma } from '@config/prisma';
import Stripe from 'stripe';
import { CreditsServiceV3 } from './credits.service.v3';
import { AICreditTransactionType } from '@prisma/client';

export class WebhooksService {
  private creditsService = new CreditsServiceV3();

  /**
   * Обрабатывает webhook от Stripe
   */
  async handleWebhook(body: string, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Webhook signature verification failed');
    }

    console.log(`🔔 Received Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          console.log(`🤷‍♂️ Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Error processing webhook ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Обрабатывает завершение checkout сессии (для разовых покупок)
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('No userId in checkout session metadata');
      return;
    }

    // Проверяем режим сессии
    if (session.mode === 'payment') {
      // Это разовая покупка - обрабатываем через payment_intent
      console.log(`💳 One-time purchase completed for user ${userId}, payment_intent: ${session.payment_intent}`);
      
      // payment_intent.succeeded обработает зачисление кредитов
      return;
    } else if (session.mode === 'subscription') {
      // Это подписка - обрабатываем через subscription events
      console.log(`🔄 Subscription checkout completed for user ${userId}, subscription: ${session.subscription}`);
      
      // customer.subscription.created обработает создание подписки
      return;
    }

    console.log(`✅ Checkout session completed: ${session.id}, mode: ${session.mode}`);
  }

  /**
   * Обрабатывает создание подписки
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    const teamId = subscription.metadata?.teamId;
    const seats = parseInt(subscription.metadata?.seats || '1');
    
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }
    
    if (!teamId) {
      console.error('No teamId in subscription metadata - subscription was created without team context');
      return;
    }

    // Получаем информацию о продукте и цене
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) return;

    const price = await prisma.stripePrice.findFirst({
      where: { stripePriceId: priceId },
      include: { product: true },
    });

    if (!price) {
      console.error(`Price not found: ${priceId}`);
      return;
    }

    // Получаем данные периода из первого элемента подписки
    const subscriptionItem = subscription.items.data[0];
    
    // Создаем запись подписки в БД
    await prisma.stripeSubscription.create({
      data: {
        userId,
        teamId,  // Сохраняем teamId из metadata
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        productId: price.productId,
        priceId: price.id,
        status: this.mapStripeSubscriptionStatus(subscription.status) as any,
        currentPeriodStart: subscriptionItem?.current_period_start ? new Date(subscriptionItem.current_period_start * 1000) : new Date(),
        currentPeriodEnd: subscriptionItem?.current_period_end ? new Date(subscriptionItem.current_period_end * 1000) : new Date(),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        // Данные о seats из metadata
        maxSeats: price.maxSeats,
        currentSeats: seats,
      },
    });

    // Используем teamId из metadata подписки
    console.log(`💰 Processing subscription for user ${userId} in team ${teamId}`);
    
    // Начисляем подписочные кредиты при создании подписки (active или trialing)
    // invoice.payment_succeeded НЕ срабатывает при первом создании подписки
    if ((subscription.status === 'active' || subscription.status === 'trialing') && price.creditsAmount > 0) {
      // Для Team планов умножаем на количество участников
      const totalCredits = price.planType === 'team' 
        ? price.creditsAmount * seats
        : price.creditsAmount;
      
      try {
        await this.creditsService.resetSubscriptionCredits(
          userId,
          totalCredits,
          teamId,
          price.planType || undefined
        );
      } catch (error) {
        console.error(`❌ Failed to set subscription credits for user ${userId} in team ${teamId}:`, error);
        throw error;
      }
    }

    console.log(`✅ Subscription created for user ${userId}`);
  }

  /**
   * Обрабатывает обновление подписки
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    const teamId = subscription.metadata?.teamId;
    
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }
    
    if (!teamId) {
      console.error('No teamId in subscription metadata - using fallback method');
      // Для старых подписок без teamId используем fallback
      const fallbackTeamId = await this.getUserCurrentTeamId(userId).catch(() => null);
      if (!fallbackTeamId) {
        console.error('Could not determine team for subscription update');
        return;
      }
    }

    // Получаем данные периода из первого элемента подписки
    const subscriptionItem = subscription.items.data[0];
    
    // Обновляем статус подписки в БД
    await prisma.stripeSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: this.mapStripeSubscriptionStatus(subscription.status) as any,
        currentPeriodStart: subscriptionItem?.current_period_start ? new Date(subscriptionItem.current_period_start * 1000) : new Date(),
        currentPeriodEnd: subscriptionItem?.current_period_end ? new Date(subscriptionItem.current_period_end * 1000) : new Date(),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

    // Получаем информацию о новом продукте и цене
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      console.log(`✅ Subscription updated: ${subscription.id} (no price info)`);
      return;
    }

    const price = await prisma.stripePrice.findFirst({
      where: { stripePriceId: priceId },
      include: { product: true },
    });

    if (!price) {
      console.error(`Price not found: ${priceId}`);
      return;
    }

    // Используем teamId из metadata или fallback для старых подписок
    const targetTeamId = teamId || await this.getUserCurrentTeamId(userId).catch(() => null);
    
    if (!targetTeamId) {
      console.error('Could not determine team for subscription update');
      return;
    }

    // Обновляем кредиты в соответствии с новым планом и статусом подписки
    if (subscription.status === 'active' && price.creditsAmount > 0) {
      console.log(`💳 Updating subscription credits to ${price.creditsAmount} of type ${price.creditType} for user ${userId} in team ${targetTeamId}`);
      
      try {
        await this.creditsService.resetSubscriptionCredits(
          userId,
          price.creditsAmount,
          targetTeamId
        );

        console.log(`✅ Subscription credits successfully updated for user ${userId} in team ${targetTeamId}: ${price.creditsAmount} ${price.creditType}`);
      } catch (error) {
        console.error(`❌ Failed to update subscription credits for user ${userId} in team ${targetTeamId}:`, error);
        throw error;
      }
    } else if (subscription.status !== 'active') {
      // Если подписка больше не активна, обнуляем подписочные кредиты
      console.log(`⚠️ Subscription is not active (${subscription.status}), resetting subscription credits for user ${userId} in team ${targetTeamId}`);
      
      try {
        await this.creditsService.resetSubscriptionCredits(
          userId,
          0,
          targetTeamId
        );

        console.log(`✅ Subscription credits reset for user ${userId} in team ${targetTeamId} due to inactive status`);
      } catch (error) {
        console.error(`❌ Failed to reset subscription credits for user ${userId} in team ${targetTeamId}:`, error);
        throw error;
      }
    }

    console.log(`✅ Subscription updated: ${subscription.id}`);
  }

  /**
   * Обрабатывает удаление подписки
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // Сначала получаем информацию о подписке из БД, чтобы получить userId
    const existingSubscription = await prisma.stripeSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    let userId = subscription.metadata?.userId;
    if (!userId && existingSubscription) {
      userId = existingSubscription.userId;
    }
    
    let teamId = subscription.metadata?.teamId;

    // Обновляем статус подписки в БД
    await prisma.stripeSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Обнуляем подписочные кредиты при удалении подписки
    if (userId) {
      console.log(`💳 Resetting subscription credits for user ${userId} due to subscription deletion`);
      
      try {
        // Используем teamId из metadata или fallback для старых подписок
        const targetTeamId = teamId || await this.getUserCurrentTeamId(userId).catch(() => null);
        
        if (targetTeamId) {
          await this.creditsService.resetSubscriptionCredits(
            userId,
            0, // Обнуляем кредиты
            targetTeamId
          );

          console.log(`✅ Subscription credits reset for user ${userId} in team ${targetTeamId} due to subscription deletion`);
        } else {
          console.warn(`⚠️ Could not determine team for user ${userId} during subscription deletion`);
        }
      } catch (error) {
        console.error(`❌ Failed to reset subscription credits for user ${userId}:`, error);
        // Не бросаем ошибку, чтобы не прервать обновление статуса подписки
      }
    } else {
      console.warn(`⚠️ No userId found for deleted subscription ${subscription.id}`);
    }

    console.log(`✅ Subscription deleted: ${subscription.id}`);
  }

  /**
   * Обрабатывает успешную оплату инвойса (продление подписки)
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription as string;
    if (!subscriptionId) return;

    const subscription = await prisma.stripeSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      include: { price: true },
    });

    if (!subscription) {
      console.error(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // ИСПРАВЛЕНО: используем teamId из подписки, а не getUserCurrentTeamId  
    const teamId = subscription.teamId;
    console.log(`💰 Processing invoice payment for user ${subscription.userId} in team ${teamId}, planType: ${subscription.price?.planType}`);
    
    // Для Team планов умножаем на количество участников
    const baseCredits = subscription.price?.creditsAmount || 0;
    const totalCredits = subscription.price?.planType === 'team' 
      ? baseCredits * subscription.currentSeats
      : baseCredits;
    
    // Сбрасываем и пополняем подписочные кредиты
    await this.creditsService.resetSubscriptionCredits(
      subscription.userId,
      totalCredits,
      teamId,
      subscription.price?.planType || undefined
    );
  }

  /**
   * Обрабатывает неудачную оплату инвойса
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription as string;
    if (!subscriptionId) return;

    // Здесь можно добавить логику обработки неудачной оплаты
    // Например, уведомления пользователю или приостановка доступа
    console.log(`❌ Invoice payment failed for subscription: ${subscriptionId}`);
  }

  /**
   * Обрабатывает успешный разовый платеж
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`🔄 Processing payment_intent.succeeded: ${paymentIntent.id}`);
    
    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      console.error('❌ No userId in payment_intent metadata');
      return;
    }
    console.log(`👤 User ID: ${userId}`);

    // Получаем данные о сессии для определения продукта
    console.log(`🔍 Looking for checkout session with payment_intent: ${paymentIntent.id}`);
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1,
    });

    const session = sessions.data[0];
    if (!session) {
      console.error('❌ No checkout session found for payment_intent');
      return;
    }
    console.log(`✅ Found checkout session: ${session.id}`);

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    if (!priceId) {
      console.error('❌ No price ID found in line items');
      return;
    }
    console.log(`💰 Price ID: ${priceId}`);

    const price = await prisma.stripePrice.findFirst({
      where: { stripePriceId: priceId },
      include: { product: true },
    });

    if (!price) {
      console.error(`❌ Price not found in local DB: ${priceId}`);
      return;
    }
    console.log(`✅ Found price in DB: ${price.creditsAmount} credits of type ${price.creditType}`);

    // Создаем запись покупки
    await prisma.stripePurchase.create({
      data: {
        userId,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer as string,
        productId: price.productId,
        priceId: price.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripePaymentStatus(paymentIntent.status) as any,
        creditsGranted: price.creditsAmount,
        creditType: price.creditType,
      },
    });

    // Получаем команду пользователя для операций с кредитами
    // Для one-time purchases teamId может не быть в metadata, используем fallback
    const userTeamId = await this.getUserCurrentTeamId(userId);
    
    // Добавляем кредиты пользователю
    console.log(`💳 Adding ${price.creditsAmount} credits of type ${price.creditType} to user ${userId} in team ${userTeamId}`);
    
    try {
      await this.creditsService.addCredits(
        userId,
        price.creditsAmount,
        price.creditType,
        AICreditTransactionType.PURCHASE,
        `Purchase of ${price.creditsAmount} credits`,
        paymentIntent.id,
        undefined,
        userTeamId
      );

      console.log(`✅ Credits successfully added for user ${userId} in team ${userTeamId}: ${price.creditsAmount} ${price.creditType}`);
    } catch (error) {
      console.error(`❌ Failed to add credits for user ${userId} in team ${userTeamId}:`, error);
      throw error;
    }
  }

  /**
   * Обрабатывает неудачный разовый платеж
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`❌ Payment failed: ${paymentIntent.id}`);
    // Здесь можно добавить логику обработки неудачного платежа
  }

  /**
   * Маппинг статусов подписки Stripe в наши enum
   */
  private mapStripeSubscriptionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'incomplete': 'INCOMPLETE',
      'incomplete_expired': 'INCOMPLETE_EXPIRED',
      'trialing': 'TRIALING',
      'active': 'ACTIVE',
      'past_due': 'PAST_DUE',
      'canceled': 'CANCELED',
      'unpaid': 'UNPAID',
      'paused': 'PAUSED',
    };

    return statusMap[status] || 'CANCELED';
  }

  /**
   * Получает ID текущей команды пользователя
   */
  private async getUserCurrentTeamId(userId: string): Promise<string> {
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

    // Возвращаем ID первой команды (можно добавить логику выбора активной команды)
    return user.teamMemberships[0].teamId;
  }

  /**
   * Маппинг статусов платежа Stripe в наши enum
   */
  private mapStripePaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'requires_payment_method': 'REQUIRES_PAYMENT_METHOD',
      'requires_confirmation': 'REQUIRES_CONFIRMATION',
      'requires_action': 'REQUIRES_ACTION',
      'processing': 'PROCESSING',
      'requires_capture': 'REQUIRES_CAPTURE',
      'canceled': 'CANCELED',
      'succeeded': 'SUCCEEDED',
    };

    return statusMap[status] || 'CANCELED';
  }
}
