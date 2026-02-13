import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User } from '@prisma/client';
import { isOSS } from '@config/edition';

// Кэш для OSS default user
let cachedOSSUser: any = null;

/**
 * Получает или создает default user для OSS edition.
 * Ленивый импорт prisma и team service чтобы избежать циклических зависимостей.
 */
export const getOrCreateOSSUser = async () => {
    if (cachedOSSUser) return cachedOSSUser;

    const { prisma } = await import('@config/prisma');
    
    const OSS_DEFAULT_USER_EMAIL = 'oss@goflow.local';
    
    let user = await prisma.user.findUnique({
        where: { email: OSS_DEFAULT_USER_EMAIL },
        select: {
            id: true,
            email: true,
            name: true,
            picture: true,
            isVerified: true,
            googleId: true,
            createdAt: true,
            updatedAt: true,
        }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: OSS_DEFAULT_USER_EMAIL,
                name: 'OSS User',
                isVerified: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                picture: true,
                isVerified: true,
                googleId: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        // Создаем default team для пользователя
        const { createDefaultTeamForUser } = await import('../modules/team/team.service');
        await createDefaultTeamForUser(user);
        console.log('✅ Created default OSS user and team');
    }

    cachedOSSUser = user;
    return user;
};

// Middleware для проверки JWT токена (edition-aware)
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    if (isOSS()) {
        // OSS: инжектим default user без проверки токена
        getOrCreateOSSUser()
            .then(user => {
                req.user = user;
                // Извлекаем teamId из заголовков
                const teamId = req.headers['x-team-id'] as string;
                if (teamId) {
                    req.teamId = teamId;
                }
                next();
            })
            .catch(err => {
                console.error('❌ Failed to get/create OSS user:', err);
                res.status(500).json({ error: 'Failed to initialize OSS user' });
            });
        return;
    }

    // Cloud: стандартная JWT аутентификация
    passport.authenticate('jwt', { session: false }, (err: any, user: User | false, info: any) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка аутентификации' });
        }
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Неавторизован',
                message: info?.message || 'Токен недействителен или отсутствует'
            });
        }
        
        req.user = user;
        
        // Извлекаем teamId из заголовков
        const teamId = req.headers['x-team-id'] as string;
        if (teamId) {
            req.teamId = teamId;
        }
        
        next();
    })(req, res, next);
};

// Middleware для опциональной проверки JWT токена
export const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (_err: any, user: User | false) => {
        if (user) {
            req.user = user;
        }
        next();
    })(req, res, next);
};

// Middleware для проверки верификации email
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Неавторизован' });
        return;
    }

    const user = req.user as User & { isVerified: boolean };
    
    if (!user.isVerified) {
        res.status(403).json({ 
            error: 'Email не подтверждён',
            message: 'Пожалуйста, подтвердите ваш email перед использованием этой функции'
        });
        return;
    }
    
    next();
}; 