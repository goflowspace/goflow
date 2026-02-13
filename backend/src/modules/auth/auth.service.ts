import jwt from "jsonwebtoken";
import { env } from "@config/env";
import { prisma } from "@config/prisma";
import bcrypt from "bcrypt";
import {sendVerificationEmail} from "../../utils/email";
import { randomUUID } from "crypto";
import { addHours, addDays } from "date-fns";
import { Request, Response } from "express";
import { createDefaultTeamForUser } from "../team/team.service";

// Типы для токенов
interface TokenPayload {
    id: string;
    type?: 'access' | 'refresh';
}

// Генерация access токена (короткоживущий)
export const generateAccessToken = (userId: string): string => {
    return jwt.sign(
        { id: userId, type: 'access' } as TokenPayload,
        env.jwtSecret,
        { expiresIn: '7d' } // 7 дней (1 неделя)
    );
};

// Генерация refresh токена (долгоживущий)
export const generateRefreshToken = async (userId: string): Promise<string> => {
    const token = jwt.sign(
        { id: userId, type: 'refresh' } as TokenPayload,
        env.jwtSecret,
        { expiresIn: '30d' } // 30 дней
    );
    
    // Сохраняем refresh токен в БД
    await prisma.refreshToken.create({
        data: {
            userId,
            token,
            expiresAt: addDays(new Date(), 30),
        },
    });
    
    return token;
};

// Очистка старых refresh токенов
const cleanupOldRefreshTokens = async (userId: string) => {
    await prisma.refreshToken.deleteMany({
        where: {
            userId,
            expiresAt: {
                lt: new Date(),
            },
        },
    });
};

export const register = async (email: string, password: string, name?: string) => {
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error("Пользователь с таким email уже существует");
    }
    
    const hashedPassword = await bcrypt.hash(password, 12); // Увеличил раунды до 12
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    });

    const team = await createDefaultTeamForUser(user);

    // Создаем запись кредитов с 500 бонусными кредитами для нового пользователя
    await prisma.userCredits.create({
        data: {
            userId: user.id,
            teamId: team.id,
            bonusCredits: 500,
        },
    });

    const token = randomUUID();
    await prisma.verificationToken.create({
        data: {
            userId: user.id,
            token,
            expiresAt: addHours(new Date(), 24),
        },
    });

    await sendVerificationEmail(email, token);

    return { 
        message: "Письмо с подтверждением отправлено.",
        userId: user.id 
    };
};

export const login = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
        throw new Error("Неверные учетные данные");
    }

    if (!user.isVerified) {
        throw new Error("Подтвердите email перед входом");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Неверные учетные данные");
    }

    // Очищаем старые токены
    await cleanupOldRefreshTokens(user.id);
    
    // Генерируем новые токены
    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id)
    // Убираем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;

    return { 
        accessToken, 
        refreshToken,
        user: userWithoutPassword 
    };
};

export const refreshAccessToken = async (refreshToken: string) => {
    try {
        // Проверяем токен
        const decoded = jwt.verify(refreshToken, env.jwtSecret) as TokenPayload;
        
        if (decoded.type !== 'refresh') {
            throw new Error("Неверный тип токена");
        }
        
        // Проверяем токен в БД
        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        
        if (!tokenRecord) {
            throw new Error("Токен не найден");
        }
        
        if (tokenRecord.expiresAt < new Date()) {
            await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
            throw new Error("Токен истёк");
        }
        
        // Генерируем новый access токен
        const accessToken = generateAccessToken(tokenRecord.userId);
        
        // Убираем пароль из ответа
        const { password: _, ...userWithoutPassword } = tokenRecord.user;
        
        return { 
            accessToken,
            user: userWithoutPassword 
        };
    } catch (error) {
        throw new Error("Недействительный refresh токен");
    }
};

export const logout = async (userId: string, refreshToken?: string) => {
    if (refreshToken) {
        // Удаляем конкретный refresh токен
        await prisma.refreshToken.deleteMany({
            where: {
                userId,
                token: refreshToken,
            },
        });
    } else {
        // Удаляем все refresh токены пользователя
        await prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }
};

export const resendVerificationTokenService = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new Error("Пользователь с таким email не найден");
    }

    if (user.isVerified) {
        throw new Error("Email уже подтверждён");
    }

    // Удаляем старый токен, если он есть
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } });

    // Генерируем новый токен
    const newToken = randomUUID();
    await prisma.verificationToken.create({
        data: {
            userId: user.id,
            token: newToken,
            expiresAt: addHours(new Date(), 24), // Новый токен на 24 часа
        },
    });

    // Отправляем email с новым токеном
    await sendVerificationEmail(email, newToken);
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.password) {
        throw new Error("Пользователь не найден");
    }
    
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
        throw new Error("Неверный текущий пароль");
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
    
    // Инвалидируем все refresh токены для безопасности
    await prisma.refreshToken.deleteMany({
        where: { userId },
    });
    
    return { message: "Пароль успешно изменён" };
};

export const oauth = async (req: Request, res: Response) => {
    try {
        const authData = req.user as any;
        
        if (!authData || !authData.token || !authData.user) {
            throw new Error('Ошибка авторизации через Google');
        }
        
        const { token, user } = authData;
        
        // Генерируем refresh токен для OAuth пользователей
        const { generateRefreshToken } = await import('./auth.service');
        const refreshToken = await generateRefreshToken(user.id);
        
        // Получаем redirect URL из сессии
        const redirectUrl = req.session.redirectUrl || '';
        
        // Очищаем redirect URL из сессии
        delete req.session.redirectUrl;
        
        // Перенаправляем на фронтенд с токенами
        const callbackUrl = new URL(env.FRONTEND_URL);
        callbackUrl.pathname = '/auth/google/callback';
        callbackUrl.searchParams.set('accessToken', token);
        callbackUrl.searchParams.set('refreshToken', refreshToken);
        
        if (redirectUrl) {
            callbackUrl.searchParams.set('redirect', redirectUrl);
        }
        
        res.redirect(callbackUrl.toString());
    } catch (error) {
        console.error('Google callback error:', error);
        res.redirect(`${env.FRONTEND_URL}/auth/google/failure`);
    }
}
