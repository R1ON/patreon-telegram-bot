import { prisma } from './prisma';

const TIERS = [
    { name: 'Junior', description: 'Джун', price: 3 },
    { name: 'Middle', description: 'Миддл', price: 6 },
    { name: 'Senior', description: 'Сеньор', price: 10 },
];

const DURATIONS = [
    { duration: 1, discount: 0 },
    { duration: 3, discount: 0.1 },
    { duration: 6, discount: 0.2 },
]

export async function init() {
    for (const tier of TIERS) {
        for (const length of DURATIONS) {
            const name = `patreon-${tier.name}-${length.duration}`;

            await prisma.product.upsert({
                where: { name },
                update: {
        
                },
                create: {
                    name,
                    price: 100 * tier.price * length.duration * (1 - length.discount),
                    description: `Подписка уровня ${tier.description}, месяцев: ${length.duration}`,
                },
            });
        }
    }
}
