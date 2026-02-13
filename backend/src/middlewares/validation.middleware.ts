import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { z } from 'zod';

export function validate(schema: z.ZodObject<any, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                
                res.status(400).json({
                    error: 'Ошибка валидации',
                    details: errors,
                });
            } else {
                res.status(500).json({
                    error: 'Внутренняя ошибка сервера',
                });
            }
            // Не вызываем next() если произошла ошибка
        }
    };
};