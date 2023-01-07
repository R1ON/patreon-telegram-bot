import { FastifyInstance } from 'fastify';
import { actionButton, registerRenderer, RenderResult, setWebhook, textWithButtons } from './services/telegram';
import { UserMachineState, UserState } from './stateMachines/userStateMachines';

// ---

const AVAILABLE_CURRENCIES = [
    { ticker: 'USDT', description: 'USDT (TRC-20)' },
    { ticker: 'TRX', description: 'TRX' },
    { ticker: 'BTC', description: 'BTC' },
];

const AVAILABLE_SUMS = [
    { price: 10, amount: 10, extraDescription: '' },
    { price: 50, amount: 55, extraDescription: '+10%' },
    { price: 100, amount: 110, extraDescription: '+20%' },
];

// ---

export async function init(host: string, app: FastifyInstance) {
    const WEBHOOK_PATH = '/secret-path';

    setWebhook(`${host}${WEBHOOK_PATH}`);

    app.post(WEBHOOK_PATH, registerRenderer(handleUserState));
}

// ---

type StateRenderer = (state: UserMachineState) => Promise<RenderResult>;

const handleUserState: StateRenderer = (state) => {
    const render: Record<UserState['value'], StateRenderer> = {
        idle: idleRendered,
        balance: balanceRenderer,
        currencySelection: currencySelectionRenderer,
        sumSelection: sumSelectionRenderer,
        readyToDeposit: readyToDepositRenderer,
        deposit: depositRenderer,
    };
    
    const handler = render[state.value] || unknownRenderer;

    return handler(state);
};

function unknownRenderer() {
    return Promise.resolve({ message: 'Что-то пошло не так 😒' });
}

async function idleRendered(state: UserMachineState) {
    return textWithButtons(`IDLE ${state.context.user.id}`, [
        [actionButton('Пополнить баланс', { type: 'BALANCE' })],
    ]);
}

async function balanceRenderer(state: UserMachineState) {
    return textWithButtons(`BALANCE ${state.context.user.id}`, [
        [
            actionButton('Пополнить', { type: 'RECHARGE' }),
            actionButton('Назад', { type: 'BACK' }),
        ],
    ]);
}

async function currencySelectionRenderer() {
    return textWithButtons('Выберите валюту пополнения', [
        AVAILABLE_CURRENCIES.map((currency) => (
            actionButton(currency.description, {
                type: 'SELECT_CURRENCY',
                currency: currency.ticker,
            })
        )),
        [actionButton('Назад', { type: 'BACK' })],
    ]);
}

async function sumSelectionRenderer(state: UserMachineState) {
    return textWithButtons(`Выберите сумму пополнения в ${state.context.currency}`, [
        AVAILABLE_SUMS.map((sum) => (
            actionButton(`${sum.amount} (${sum.extraDescription})`, {
                type: 'SELECT_AMOUNT',
                price: sum.price,
                amount: sum.amount,
            })
        )),
        [actionButton('Назад', { type: 'BACK' })],
    ]);
}

async function readyToDepositRenderer(state: UserMachineState) {
    const { currency, amount, price } = state.context;

    return textWithButtons(`Вносим ${currency} в объеме ${price}, получаем $${amount}`, [
        [
            actionButton('Все верно', { type: 'OK' }),
            actionButton('Назад', { type: 'BACK' }),
        ],
    ]);
}

async function depositRenderer(state: UserMachineState) {
    // ТУТ
    const { currency, amount, price } = state.context;

    return textWithButtons(`Вносим ${currency} в объеме ${price}, получаем $${amount}`, [
        [
            actionButton('Все верно', { type: 'OK' }),
            actionButton('Назад', { type: 'BACK' }),
        ],
    ]);
}
