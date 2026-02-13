import { Router } from 'express';
import { authenticateJWT } from '@middlewares/auth.middleware';
import { getUsageAnalyticsData, getRecentTransactionsData } from './usage-analytics.controller';
import { asyncHandler } from '@middlewares/errorHandler';

const router = Router();

router.get('/usage', authenticateJWT, asyncHandler(getUsageAnalyticsData));
router.get('/recent-transactions', authenticateJWT, asyncHandler(getRecentTransactionsData));

export default router;
