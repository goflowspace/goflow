import { Request, Response } from 'express';
import { getUsageAnalytics, getRecentTransactions } from './usage-analytics.service';

/**
 * Получить аналитику использования
 * GET /api/analytics/usage?userId=...&days=30
 */
export const getUsageAnalyticsData = async (req: Request, res: Response) => {
  try {
    const teamId = req.teamId;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Team ID is required'
      });
    }

    const { userId, days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be a number between 1 and 365'
      });
    }

    const analytics = await getUsageAnalytics(
      teamId,
      userId as string,
      daysNum
    );

    res.json({
      success: true,
      data: analytics
    });

  } catch (error: any) {
    console.error('Usage analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage analytics',
      message: error.message
    });
  }
};

/**
 * Получить недавние транзакции
 * GET /api/analytics/recent-transactions?userId=...&limit=20
 */
export const getRecentTransactionsData = async (req: Request, res: Response) => {
  try {
    const teamId = req.teamId;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Team ID is required'
      });
    }

    const { userId, limit = '20' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 100'
      });
    }

    const transactions = await getRecentTransactions(
      teamId,
      userId as string,
      limitNum
    );

    res.json({
      success: true,
      data: transactions
    });

  } catch (error: any) {
    console.error('Recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent transactions',
      message: error.message
    });
  }
};
