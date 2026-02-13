import { Router } from "express";
import { sendFeedbackController } from "./feedback.controller";
import { authenticateJWT, requireVerifiedEmail } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validation.middleware";
import { feedbackSchema } from "./feedback.validation";
import { authRateLimiter } from "@middlewares/rateLimiter.middleware";
import { asyncHandler } from "@middlewares/errorHandler";

const router = Router();

// Отправка feedback
// Требует аутентификации и верификации email
router.post("/", 
  authRateLimiter,  // Rate limiting для предотвращения спама
  authenticateJWT,
  requireVerifiedEmail,
  validate(feedbackSchema),
  asyncHandler(sendFeedbackController)
);

export default router;
