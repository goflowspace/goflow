import { Request, Response, NextFunction } from "express";
import { processFeedback } from "./feedback.service";
import { logger } from "@config/logger";

/**
 * Контроллер для отправки feedback от пользователя
 */
export const sendFeedbackController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, projectId, clientVersion } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    await processFeedback(userId, text, projectId, clientVersion);

    res.status(200).json({
      success: true,
      message: 'Feedback sent successfully'
    });

  } catch (error) {
    logger.error('Failed to process feedback in controller', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id 
    });
    
    next(error);
  }
};
