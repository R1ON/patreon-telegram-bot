import { Record, Literal, String, Static, Number } from 'runtypes';
import { FastifyInstance } from 'fastify';
import { Context, NarrowedContext, Markup } from 'telegraf';
import { MountMap } from 'telegraf/typings/telegram-types';
import { Update } from 'telegraf/typings/core/types/typegram';
import { prisma } from './prisma';
import { getExchangeRate } from './services/exchangeRates';
import { bot, registerRenderer, RenderResult } from './services/telegram';
import { UserMachineState } from './stateMachines/userStateMachines';

// ---

// 03:28:39

const INVOICE_STATUS_INCOMPLETE = 'incomplete';

const BALANCE_CURRENCY_SELECTION_TYPE = 'BR';
const BALANCE_RECHARGE_AMOUNT_SELECTION = 'BRS';
const BalanceRechargeCurrencySelection = Record({
    type: Literal(BALANCE_CURRENCY_SELECTION_TYPE),
    currency: String,
});
const BalanceRechargeAmountSelection = Record({
    type: Literal(BALANCE_RECHARGE_AMOUNT_SELECTION),
    refillId: Number,
});

const RECHARGE_AMOUNTS = [
    { amount: 10, price: 10 },
    { amount: 55, price: 50 },
    { amount: 110, price: 100 }, 
];
const SUPPORTED_CURRENCIES = [
    { ticker: 'USDT', description: 'USDT (TRC-20)' },
    { ticker: 'TRX', description: 'TRX' },
    { ticker: 'BTC', description: 'BTC' },
];
const WEBHOOK_PATH = '/secret-path';

function getCurrentUser(telegramId: string) {
    return prisma.user.upsert({
        where: { telegramId },
        create: { telegramId },
        update: {},
    });
}

type CommandContext = NarrowedContext<Context<Update>, MountMap['text']>;
type CallbackQueryContext = NarrowedContext<Context<Update>, MountMap['callback_query']>;

async function balanceStatus(ctx: CommandContext) {
    const telegramId = ctx.from.id.toString();
    const user = await getCurrentUser(telegramId);

    const replyMessage = [
        `Ваш баланс 💰 ${user.balance} USD`,
        'Чтобы пополнить баланс, выберите валюту пополнения'
    ].join('\n');
    
    ctx.reply(
        replyMessage,
        Markup.inlineKeyboard(
            SUPPORTED_CURRENCIES.map((currency) => (
                Markup.button.callback(
                    currency.ticker,
                    JSON.stringify(
                        BalanceRechargeCurrencySelection.check({
                            type: BALANCE_CURRENCY_SELECTION_TYPE,
                            currency: currency.ticker,
                        }),
                    ),
                )
            )),
        ),
    );
}

async function balanceAmountSelection(
    ctx: CallbackQueryContext,
    data: Static<typeof BalanceRechargeCurrencySelection>,
) {
    if (!ctx.from) {
        throw new Error('Missing `from` field');
    }

    const user = await getCurrentUser(ctx.from.id.toString());
    const refillRequest = await prisma.refillRequest.create({
        data: {
            userId: user.id,
            currency: data.currency,
            status: INVOICE_STATUS_INCOMPLETE,
        },
    });

    const exchangeRate = await getExchangeRate(data.currency);

    ctx.reply(
        'Выберите желаемую сумму пополнения',
        Markup.inlineKeyboard(
            RECHARGE_AMOUNTS.map(({ amount, price }) => {
                const priceInSelectedCurrency = Math.floor(price * exchangeRate * 1e6);
    
                return [
                    Markup.button.callback(
                        `${priceInSelectedCurrency / 1e6} ${data.currency} (${amount})`,
                        JSON.stringify(
                            BalanceRechargeAmountSelection.check({
                                type: BALANCE_RECHARGE_AMOUNT_SELECTION,
                                refillId: refillRequest.id,
                            } as Static<typeof BalanceRechargeAmountSelection>),
                        ),
                    ),
                ];
            }),
        ),
    );
}

async function handleUserState(state: UserMachineState): Promise<RenderResult> {
    if (state.matches('idle')) {
        return {
            message: 'IDLE',
            extra: Markup.inlineKeyboard([
                Markup.button.callback('BALANCE', JSON.stringify({ type: 'BALANCE' })),
            ]),
        };
    }
    else if (state.matches('balance')) {
        return {
            message: 'BALANCE',
            extra: Markup.inlineKeyboard([
                Markup.button.callback('BACK', JSON.stringify({ type: 'BACK' })),
            ]),
        };
    }

    return {
        message: 'UNKNOWN',
    };
}

export async function init(host: string, app: FastifyInstance) {
    bot.telegram.setWebhook(`${host}${WEBHOOK_PATH}`);

    app.post(WEBHOOK_PATH, (req, res) => {
        bot.handleUpdate(req.body as any, res.raw)
    });

    registerRenderer(handleUserState);

    // bot.command('start', (ctx) => {
    //     const data = JSON.stringify({ 1: 'hi', 2: 'hello', 3: 'good morning' });
    //     const base64 = Buffer.from(data).toString('base64');

    //     const message = `Привет[\u200c](https://fake.host/${base64})`;

    //     updateUserScreen(
    //         ctx.chat.id,
    //         message,
    //         {
    //             parse_mode: 'MarkdownV2',
    //             ...Markup.inlineKeyboard([Markup.button.callback('test', '123')]),
    //         },
    //     );
    // })

    // bot.command('balance', balanceStatus);
    // bot.on('callback_query', (ctx) => {
    //     if (!ctx.chat) {
    //         return;
    //     }
    //     updateUserScreen(ctx.chat.id, 'TEST EDIT');
    //     // const data = JSON.parse(ctx.callbackQuery.data || '');

    //     // if (BalanceRechargeCurrencySelection.validate(data).success) {
    //     //     balanceAmountSelection(
    //     //         ctx,
    //     //         BalanceRechargeCurrencySelection.check(data),
    //     //     );
    //     // }
    //     // else {
    //     //     console.error('callback_query error' , data);
    //     // }
    // });
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
