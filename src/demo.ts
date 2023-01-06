// import * as os from 'os';
// import * as path from 'path';

// // @ts-ignore
// import QRcode from 'qrcode';
// import { Telegraf } from 'telegraf';
// import { request as fetch } from 'undici';
// import { fastify } from 'fastify';
// import nconf, { add } from 'nconf';
// import { PrismaClient } from '@prisma/client';

// // @ts-ignore
// import TronWeb from 'tronweb';

// nconf.argv().env().file('config.json');
// const { apiKey: telegramApiKey } = nconf.get('telegram');
// const {
//     clientId: patreonClientId,
//     clientSecret: patreonClientSecret,
// } = nconf.get('patreon');

// const httpsHost = 'https://1808-147-30-14-186.ngrok.io';
// const PATREON_REDIRECT_URI = '/oauth/patreon/callback';

// // function callTelegramMethod(method: string, payload: object) {
// //     return fetch(`${TELEGRAM_BASE_URL}/${method}`, {
// //         method: 'POST',
// //         body: JSON.stringify(payload),
// //         headers: {
// //             'Content-Type': 'application/json',
// //         },
// //     }).then((value) => value.json());
// // }


// // function setWebhook(url: string) {
// //     return callTelegramMethod('setWebhook', { url })
// // }

// const prisma = new PrismaClient();
// const app = fastify();

// async function run() {
//     const bot = new Telegraf(telegramApiKey);
//     bot.telegram.setWebhook(`${httpsHost}/secret-path`);

//     app.get(PATREON_REDIRECT_URI, async (req, res) => {
//         res.status(200).send({ success: true });

//         const { state, code } = req.query as any;

//         try {
//             const params = new URLSearchParams();
//             params.append('code', code);
//             params.append('grant_type', 'authorization_code');
//             params.append('client_id', patreonClientId);
//             params.append('client_secret', patreonClientSecret);
//             params.append('redirect_uri', `${httpsHost}${PATREON_REDIRECT_URI}`);
            
//             const reply = await fetch('https://www.patreon.com/api/oauth2/token', {
//                 method: 'POST',
//                 body: params.toString(),
//                 headers: {
//                     'Content-Type': 'application/x-www-form-urlencoded',
//                 },
//             }).then((value) => value.body.json());

//             const identity = await fetch('https://www.patreon.com/api/oauth2/v2/identity', {
//                 headers: {
//                     authorization: `Bearer ${reply.access_token}`,
//                 },
//             }).then((value) => value.body.json());

//             await prisma.user.update({
//                 where: { telegramId: state },
//                 data: {
//                     patreonAccessToken: reply.access_token,
//                     patreonRefreshToken: reply.refresh_token,
//                 },
//             });

//             console.log(identity);

//             bot.telegram.sendMessage(state, 'Успешно авторизовано');
//         }
//         catch (err) {
//             console.error(err);
//             bot.telegram.sendMessage(state, 'Авторизация не удалась');
//         }
//     });

//     app.post('/secret-path', (req, rep) => bot.handleUpdate(req.body as any, rep.raw));

//     bot.command('start', async (ctx) => {
//         const user = await prisma.user.upsert({
//             where: {
//                 telegramId: ctx.from.id.toString(), 
//             },
//             update: {
//                 // todo: update
//             },
//             create: {
//                 telegramId: ctx.from.id.toString(),
//             },
//         });

//         const fileName = path.resolve(os.tmpdir(), 'test.png');
//         await QRcode.toFile(fileName, 'TSJwQP9De3UbdP7eK6gRF6UUzrns39whDx?amount=1&label=t2');

//         ctx.replyWithPhoto({ source: fileName });
//     });

//     bot.command('patreon', (ctx) => {
//         ctx.reply('auth', {
//             reply_markup: {
//                 inline_keyboard: [
//                     [{ text: 'Авторизоваться', url: makePatreonOauthUrl(ctx.from.id.toString()) }],
//                 ],
//             },
//         });
//     });

//     bot.on('callback_query', (ctx) => {
//         ctx.reply('ok');
//     });

//     bot.on('text', (ctx) => {
//         if (ctx.update.message.text.toLocaleLowerCase() === 'ого') {
//             return ctx.reply('Че ого, тварь?');
//         }
//         ctx.telegram.sendMessage(ctx.message.chat.id, `hello ${ctx.message.from.first_name}`);
//         ctx.reply(`hello ${ctx.state.role} #2`);
//     });
// };

// app.listen(8080, (err, address) => {
//     if (err) {
//         throw err;
//     }
//     console.log('Listening...', address);
// });
// run();

// function makePatreonOauthUrl(state: string) {
//     return [
//         'https://www.patreon.com/oauth2/authorize?response_type=code',
//         `&client_id=${patreonClientId}`,
//         `&redirect_uri=${httpsHost}${PATREON_REDIRECT_URI}`,
//         `&scope=${encodeURIComponent(['identity', 'identity.memberships', 'identity[email]'].join(' '))}`,
//         `&state=${state}`,
//     ].join('');
// }


// // const tronWeb = new TronWeb({
// //     fullHost: 'api.shasta.trongrid.io',
// //     headers: { "TRON-PRO-API-KEY": '7f0942f1-7516-4d90-b792-3f8632b7ea18' },
// // })