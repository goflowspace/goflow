import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { downloadImageAsBase64 } from "../utils/imageUtils";
import { createDefaultTeamForUser } from "../modules/team/team.service";
import { isTest } from "./env";
import { isCloud } from "./edition";

// Интерфейс для JWT payload
interface JwtPayload {
    id: string;
    type?: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

// Опции для JWT стратегии
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: env.jwtSecret,
    ignoreExpiration: false, // Не игнорировать истечение токена
};

// JWT стратегия для access токенов
passport.use(
    'jwt',
    new JwtStrategy(jwtOptions, async (payload: JwtPayload, done) => {
        try {
            // Проверяем тип токена
            if (payload.type && payload.type !== 'access') {
                return done(null, false);
            }
            
            // Находим пользователя по ID из payload токена
            const user = await prisma.user.findUnique({ 
                where: { id: payload.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                    isVerified: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true,
                    // Не включаем пароль в выборку
                }
            });

            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    })
);

// Google OAuth стратегия — только для Cloud edition
if (isCloud() && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
passport.use(
    new GoogleStrategy(
        {
            clientID: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackURL: env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true,
            scope: ['profile', 'email'],
        },
        async (_req, _accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error("Email не найден в профиле Google"));
                }

                // QA авторизация: проверка домена и whitelist
                if (isTest) {
                    console.log(`[QA AUTH] Проверка авторизации для email: ${email}`);
                    
                    const isAllowedByDomain = email.endsWith(`@${env.QA_ALLOWED_DOMAIN}`);
                    
                    let isAllowedByWhitelist = false;
                    if (env.QA_WHITELIST_EMAILS) {
                        const whitelistEmails = env.QA_WHITELIST_EMAILS
                            .split(',')
                            .map(e => e.trim())
                            .filter(e => e.length > 0);
                        isAllowedByWhitelist = whitelistEmails.includes(email);
                    }
                    
                    if (!isAllowedByDomain && !isAllowedByWhitelist) {
                        console.error(`[QA AUTH] Доступ запрещен для email: ${email}. Разрешены только @${env.QA_ALLOWED_DOMAIN} или emails из whitelist.`);
                        return done(new Error(`Доступ разрешен только для домена @${env.QA_ALLOWED_DOMAIN} или утвержденных email адресов`));
                    }
                    
                    console.log(`[QA AUTH] Доступ разрешен для email: ${email} (домен: ${isAllowedByDomain}, whitelist: ${isAllowedByWhitelist})`);
                }

                // Получаем URL аватарки из Google профиля
                const pictureUrl = profile.photos?.[0]?.value;
                let picture: string | null = null;

                // Если есть URL аватарки, загружаем её и конвертируем в base64
                if (pictureUrl) {
                    try {
                        picture = await downloadImageAsBase64(pictureUrl);
                    } catch (error) {
                        // Продолжаем без аватарки
                    }
                }

                let user = await prisma.user.findUnique({ 
                    where: { email },
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
                    // Создаём нового пользователя
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: profile.displayName || profile.name?.givenName || 'User',
                            picture,
                            googleId: profile.id,
                            isVerified: true, // Google аккаунты считаем верифицированными
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

                    await createDefaultTeamForUser(user);
                } else {
                    // Обновляем существующего пользователя
                    if (!user.googleId) {
                        user = await prisma.user.update({
                            where: { email },
                            data: { 
                                googleId: profile.id,
                                isVerified: true,
                                name: user.name || profile.displayName || profile.name?.givenName,
                                picture: picture || user.picture // Обновляем аватарку если есть новая
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
                    } else if (!user.isVerified) {
                        // Если пользователь не верифицирован, верифицируем
                        user = await prisma.user.update({
                            where: { email },
                            data: { 
                                isVerified: true,
                                picture: picture || user.picture // Обновляем аватарку если есть новая
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
                    } else if (picture && picture !== user.picture) {
                        // Обновляем аватарку если она изменилась
                        user = await prisma.user.update({
                            where: { email },
                            data: { picture },
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
                    }
                }

                // Генерируем JWT токен (access token)
                const token = jwt.sign(
                    { id: user.id, type: 'access' } as JwtPayload, 
                    env.jwtSecret as string, 
                    { expiresIn: "7d" }
                );

                return done(null, { user, token } as any);
            } catch (error) {
                console.error('Google OAuth error:', error);
                return done(error instanceof Error ? error : new Error('Ошибка Google OAuth'));
            }
        }
    )
);
} // end isCloud() check

// Сериализация пользователя (не используется при session: false)
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Десериализация пользователя (не используется при session: false)
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id },
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
        done(null, user as any);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
