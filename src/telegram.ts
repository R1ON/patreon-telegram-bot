import { Record, Literal, String, Number } from 'runtypes';
import { FastifyInstance } from 'fastify';
import { actionButton, registerRenderer, RenderResult, setWebhook } from './services/telegram';
import { UserMachineState } from './stateMachines/userStateMachines';

// ---

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

async function handleUserState(state: UserMachineState): Promise<RenderResult> {
    if (state.matches('idle')) {
        return {
            message: `IDLE ${state.context.counter}`,
            extra: {
                reply_markup: {
                    inline_keyboard: [
                        [actionButton('Пополнить баланс', { type: 'BALANCE' })],
                    ],
                },
            },
        };
    }
    else if (state.matches('balance')) {
        return {
            message: `BALANCE ${state.context.counter}`,
            extra: {
                reply_markup: {
                    inline_keyboard: [
                        [actionButton('Назад', { type: 'BACK' })],
                    ],
                },
            },
        };
    }

    return {
        message: 'UNKNOWN',
    };
}

export async function init(host: string, app: FastifyInstance) {
    setWebhook(`${host}${WEBHOOK_PATH}`);

    app.post(WEBHOOK_PATH, registerRenderer(handleUserState));
}
