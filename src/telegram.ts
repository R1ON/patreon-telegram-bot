import { FastifyInstance } from 'fastify';
import { fetch } from 'undici';
import { Telegraf } from 'telegraf';
import { telegramApiKey } from './config';
import { prisma } from './prisma';

const TELEGRAM_BASE_URL = `https://api.telegram.org/bot${telegramApiKey}`;
const WEBHOOK_PATH = '/secret-path';

const bot = new Telegraf(telegramApiKey);

function getCurrentUser(telegramId: string) {
    return prisma.user.upsert({
        where: { telegramId },
        create: { telegramId },
        update: {},
    });
}

// function callTelegramMethod(method: string, payload: object) {
//     return fetch(`${TELEGRAM_BASE_URL}/${method}`, {
//         method: 'POST',
//         body: JSON.stringify(payload),
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     }).then((value) => value.json());
// }


// function setWebhook(url: string) {
//     return callTelegramMethod('setWebhook', { url })
// }

export async function init(host: string, app: FastifyInstance) {
    bot.telegram.setWebhook(`${host}${WEBHOOK_PATH}`);


    app.post(WEBHOOK_PATH, (req, res) => {
        bot.handleUpdate(req.body as any, res.raw)
    });

    bot.command('subscription', async (ctx) => {
        const telegramId = ctx.from.id.toString();
        const user = await getCurrentUser(telegramId);
        
        const groups = await prisma.productGroup.findMany({
            include: { products: true },
        });

        // речь про баланс
        // 03:15:50

        // TODO: add subscription flag
        const subscriptionProducts = await prisma.product.findMany();
        
        // const products = groups.map((group) => [
        //     {
        //         text: `💰 ${product.description} ($${(product.price / 100).toFixed(2)})`,
        //         callback_data: JSON.stringify({
        //             userId: user.id,
        //             productId: product.id,
        //         }),
        //     }
        // ]);

        // ctx.reply("Вы можете купить подписку", {
        //     reply_markup: {
        //         inline_keyboard: products,
        //     },
        // });
    });
//     app.post(WEBHOOK_PATH, (req, res) => {
//         // @ts-ignore
//         const { message } = req.body;

//         console.log('body', req.body);

//         if (message.text === '/start') {
//             callTelegramMethod('sendMessage', {
//                 chat_id: message.chat.id,
//                 text: 'hello',
//             });
//         }

//         res.send({ success: true });
//     });

//     const response = await setWebhook(`${host}${WEBHOOK_PATH}`);
//     console.log('response', response);
}
