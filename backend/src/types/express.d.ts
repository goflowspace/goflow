import { User as PrismaUser } from '@prisma/client';

declare global {
    namespace Express {
        // Расширяем Express.User полями Prisma User — единственная точка декларации
        interface User extends PrismaUser {}

        interface Request {
            teamId?: string;
        }
    }
} 