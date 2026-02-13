import { Request, Response, NextFunction } from "express";
import {
    register, 
    login, 
    resendVerificationTokenService,
    refreshAccessToken,
    logout,
    changePassword
} from "./auth.service";
import {prisma} from "@config/prisma";
import { User } from "@prisma/client";

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, name } = req.body;
        const result = await register(email, password, name);
        res.status(201).json({ 
            success: true,
            message: result.message,
            userId: result.userId 
        });
    } catch (error) {
        next(error);
    }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        
        // Измеряем время валидации и аутентификации
        if (req.timing) {
            req.timing.addMetric('auth_validate', 'User credentials validation');
        }
        
        const { accessToken, refreshToken, user } = await login(email, password);
        
        if (req.timing) {
            req.timing.endMetric('auth_validate');
            req.timing.addMetric('auth_cookie', 'Setting auth cookies');
        }
        
        // Устанавливаем refresh токен в httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
        });
        
        if (req.timing) {
            req.timing.endMetric('auth_cookie');
        }
        
        res.json({ 
            success: true,
            accessToken, 
            user 
        });
    } catch (error) {
        next(error);
    }
};

export const refreshTokenController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const cookieRefreshToken = req.cookies?.refreshToken;
        
        const token = refreshToken || cookieRefreshToken;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: "Refresh токен не предоставлен" 
            });
        }
        
        const { accessToken, user } = await refreshAccessToken(token);
        
        res.json({ 
            success: true,
            accessToken, 
            user 
        });
    } catch (error) {
        next(error);
    }
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
        
        const user = req.user as User & { id: string };
        if (user) {
            await logout(user.id, refreshToken);
        }
        
        // Очищаем cookie
        res.clearCookie('refreshToken');
        
        res.json({ 
            success: true,
            message: "Вы успешно вышли из системы" 
        });
    } catch (error) {
        next(error);
    }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;

        const tokenRecord = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!tokenRecord) {
            return res.status(400).json({ 
                success: false,
                error: "Токен недействителен или устарел" 
            });
        }

        if (tokenRecord.expiresAt < new Date()) {
            await prisma.verificationToken.delete({ where: { token } });
            return res.status(400).json({ 
                success: false,
                error: "Токен истёк" 
            });
        }

        // Обновляем пользователя
        await prisma.user.update({
            where: { id: tokenRecord.userId },
            data: { isVerified: true },
        });

        // Удаляем использованный токен
        await prisma.verificationToken.delete({ where: { token } });

        res.json({ 
            success: true,
            message: "Email успешно подтверждён!" 
        });
    } catch (error) {
        next(error);
    }
};

export const resendVerificationToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        await resendVerificationTokenService(email);
        res.json({ 
            success: true,
            message: "Новый токен подтверждения отправлен. Проверьте почту." 
        });
    } catch (error) {
        next(error);
    }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ 
                success: false,
                error: "Неавторизован" 
            });
            return;
        }
        
        const { currentPassword, newPassword } = req.body;
        const user = req.user as User & { id: string };
        const result = await changePassword(user.id, currentPassword, newPassword);
        
        res.json({ 
            success: true,
            message: result.message 
        });
    } catch (error) {
        next(error);
    }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Измеряем время проверки авторизации
        if (req.timing) {
            req.timing.addMetric('auth_check', 'Authorization check');
        }

        if (!req.user) {
            if (req.timing) {
                req.timing.endMetric('auth_check');
            }
            return res.status(401).json({ 
                success: false,
                error: "Неавторизован" 
            });
        }

        if (req.timing) {
            req.timing.endMetric('auth_check');
            req.timing.addMetric('user_serialization', 'User data serialization');
        }

        // Убираем пароль из ответа
        const user = req.user as User & { password?: string };
        const { password: _, ...userWithoutPassword } = user;

        if (req.timing) {
            req.timing.endMetric('user_serialization');
        }

        res.json({ 
            success: true,
            user: {
                ...userWithoutPassword
            }
        });
    } catch (error) {
        next(error);
    }
};