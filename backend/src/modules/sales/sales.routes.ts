import { Router } from "express";
import { authenticateJWT } from "@middlewares/auth.middleware";
import * as salesController from "./sales.controller";
import { asyncHandler } from "@middlewares/errorHandler";

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateJWT);

// Sales
router.post(
    "/contact",
    asyncHandler(salesController.contactSales)
);

export default router;
