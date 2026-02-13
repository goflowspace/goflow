import { PrismaClient } from '@prisma/client'
// import { withAccelerate } from '@prisma/extension-accelerate'
// import {isProd} from "@config/env";

export const prisma = new PrismaClient({
  transactionOptions: {
    timeout: 30000, // 30 секунд вместо стандартных 5 секунд
  },
});
// const extendedPrisma = isProd ? prisma.$extends(withAccelerate()) : prisma;

// export { extendedPrisma as prisma };