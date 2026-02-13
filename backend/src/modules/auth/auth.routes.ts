import {Router} from "express";
import {
    loginController, 
    registerController, 
    resendVerificationToken, 
    verifyEmail,
    refreshTokenController,
    logoutController,
    changePasswordController,
    getCurrentUser
} from "./auth.controller";
import passport from "@config/passportConfig";
import { authenticateJWT, requireVerifiedEmail } from "@middlewares/auth.middleware";
import { validate } from "@middlewares/validation.middleware";
import {
    registerSchema,
    loginSchema,
    resendVerificationSchema,
    verifyEmailSchema,
    refreshTokenSchema,
    changePasswordSchema
} from "./auth.validation";
import { authRateLimiter, registrationRateLimiter, emailRateLimiter } from "@middlewares/rateLimiter.middleware";
import { oauth } from "./auth.service";
import { asyncHandler } from "@middlewares/errorHandler";

// Расширяем тип сессии
declare module 'express-session' {
    interface SessionData {
        redirectUrl?: string;
    }
}

const router = Router();

// 🔹 Публичные маршруты

// Регистрация с валидацией и rate limiting
router.post("/register", 
    registrationRateLimiter,
    validate(registerSchema), 
    registerController
);

// Вход с валидацией и rate limiting
router.post("/login", 
    authRateLimiter,
    validate(loginSchema), 
    loginController
);

// Обновление access токена
router.post("/refresh", validate(refreshTokenSchema), asyncHandler(refreshTokenController));

// Выход
router.post("/logout", optionalAuthenticate, logoutController);

// Верификация email
router.get("/verify-email/:token", validate(verifyEmailSchema), asyncHandler(verifyEmail));

// Повторная отправка токена верификации с rate limiting
router.post("/resend-verification", 
    emailRateLimiter,
    validate(resendVerificationSchema), 
    resendVerificationToken
);

// 🔹 Защищённые маршруты

// Получение текущего пользователя
router.get("/me", authenticateJWT, asyncHandler(getCurrentUser));

// Смена пароля
router.post("/change-password", 
    authenticateJWT, 
    requireVerifiedEmail, 
    validate(changePasswordSchema), 
    changePasswordController
);

// 🔹 OAuth маршруты

// Инициация Google авторизации с поддержкой redirect URL
router.get("/google", (req, res, next) => {
    const { redirect } = req.query;
    
    // Сохраняем redirect URL в сессии
    if (redirect && typeof redirect === 'string') {
        req.session.redirectUrl = redirect;
    }
    
    passport.authenticate("google", { 
        scope: ["profile", "email"],
        prompt: 'select_account' // Позволяет выбрать аккаунт Google
    })(req, res, next);
});

// Обработка callback-а после успешной авторизации в Google
router.get(
    "/google/callback",
    passport.authenticate("google", { 
        session: false,
        failureRedirect: '/auth/google/failure' 
    }),
    oauth
);

// Обработка ошибок Google авторизации
router.get("/google/failure", (_req, res) => {
    res.status(401).json({ 
        success: false,
        error: "Ошибка авторизации через Google" 
    });
});

// Middleware для опциональной аутентификации
function optionalAuthenticate(req: any, res: any, next: any) {
    passport.authenticate('jwt', { session: false }, (_err: any, user: any) => {
        if (user) {
            req.user = user;
        }
        next();
    })(req, res, next);
}

export default router;
