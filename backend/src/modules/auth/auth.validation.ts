import { z } from 'zod';

// Схема для регистрации
export const registerSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Некорректный email')
            .toLowerCase()
            .trim(),
        password: z.string()
            .min(8, 'Пароль должен содержать минимум 8 символов')
            .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
            .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
            .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
            .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один специальный символ'),
        name: z.string()
            .min(2, 'Имя должно содержать минимум 2 символа')
            .max(50, 'Имя не должно превышать 50 символов')
            .optional()
    })
});

// Схема для входа
export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Некорректный email')
            .toLowerCase()
            .trim(),
        password: z.string()
            .min(1, 'Пароль обязателен')
    })
});

// Схема для повторной отправки токена верификации
export const resendVerificationSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Некорректный email')
            .toLowerCase()
            .trim()
    })
});

// Схема для верификации email
export const verifyEmailSchema = z.object({
    params: z.object({
        token: z.string()
            .uuid('Некорректный токен')
    })
});

// Схема для refresh токена
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string()
            .min(1, 'Refresh токен обязателен')
    })
});

// Схема для смены пароля
export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string()
            .min(1, 'Текущий пароль обязателен'),
        newPassword: z.string()
            .min(8, 'Новый пароль должен содержать минимум 8 символов')
            .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
            .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
            .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
            .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один специальный символ')
    })
});

// Схема для сброса пароля
export const resetPasswordRequestSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Некорректный email')
            .toLowerCase()
            .trim()
    })
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string()
            .uuid('Некорректный токен'),
        newPassword: z.string()
            .min(8, 'Пароль должен содержать минимум 8 символов')
            .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
            .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
            .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
            .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один специальный символ')
    })
}); 