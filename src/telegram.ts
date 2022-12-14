import { FastifyInstance } from 'fastify';
import { fetch } from 'undici';
import { Telegraf } from 'telegraf';
import { telegramApiKey } from './config';

const TELEGRAM_BASE_URL = `https://api.telegram.org/bot${telegramApiKey}`;
const WEBHOOK_PATH = '/secret-path';

const bot = new Telegraf(telegramApiKey);

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

    // 2:21:43

    app.post(WEBHOOK_PATH, (req, res) => {
        bot.handleUpdate(req.body as any, res.raw)
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
