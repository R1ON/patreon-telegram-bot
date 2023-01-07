import { User } from '@prisma/client';
import { prisma } from '../prisma';

// ---

export async function getOrCreateUserByTelegramId(telegramId: number): Promise<User> {
    const user = await prisma.user.findUnique({
        where: { telegramId },
    });

    if (user) {
        return user;
    }

    return prisma.user.create({
        data: { telegramId },
    });
}
