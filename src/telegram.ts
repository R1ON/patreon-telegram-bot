import { FastifyInstance } from 'fastify';
import { getExchangeRate } from './services/exchangeRates';
import { actionButton, registerRenderer, RenderResult, setWebhook, textWithButtons } from './services/telegram';
import { UserState } from './stateMachines/userStateMachines';
import { getOrCreateWallet as tronWallet } from './wallets/tron';

// ---

const AVAILABLE_CURRENCIES = [
    { ticker: 'USDT', description: 'USDT (TRC-20)', handler: tronWallet, scheme: 'usdt' },
    { ticker: 'TRX', description: 'TRX', handler: tronWallet, scheme: 'tron' },
    { ticker: 'BTC', description: 'BTC', scheme: 'btc' },
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

declare function assertExhaustiveness(arg: never): never;

type SpecificState<
    T extends UserState['value'],
    S extends UserState = UserState
> = S extends { value: T } ? S : never;
type StateRenderer<T extends UserState = UserState> = (state: T) => Promise<RenderResult>;

// 2:25:23
const handleUserState: StateRenderer = (state) => {
    if (isPendingValidationState(state)) {
        throw new Error('this state should not be rendered');
    }

    if (state.value === 'idle') {
        return idleRendered(state);
    }

    if (state.value === 'balance') {
        return balanceRenderer(state);
    }

    if (state.value === 'currencySelection') {
        throw new Error('fix me');
    }

    if (
        state.value instanceof Object &&
        'currencySelection' in state.value &&
        state.value.currencySelection === 'validationCompleted'
    ) {
        return currencySelectionRenderer(state);
    }

    if (state.value === 'sumSelection') {
        return sumSelectionRenderer(state);
    }

    if (state.value === 'sumSelectionTimeout') {
        return sumSelectionTimeoutRenderer(state);
    }

    if (state.value === 'readyToDeposit') {
        return readyToDepositRenderer(state);
    }

    if (state.value === 'deposit') {
        return depositRenderer(state);
    }

    assertExhaustiveness(state.value);
};

async function idleRendered(state: SpecificState<'idle'>) {
    return textWithButtons(`IDLE ${state.context.user.id}`, [
        [actionButton('Пополнить баланс', { type: 'BALANCE' })],
    ]);
}

async function balanceRenderer(state: SpecificState<'balance'>) {
    return textWithButtons(`BALANCE ${state.context.user.id}`, [
        [
            actionButton('Пополнить', { type: 'RECHARGE' }),
            actionButton('Назад', { type: 'BACK' }),
        ],
    ]);
}

async function currencySelectionRenderer(_state: UserState) {
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

async function sumSelectionTimeoutRenderer(_state: UserState) {
    return textWithButtons('Время вышло', [
        [actionButton('Назад', { type: 'BACK' })],
    ]);
}

async function sumSelectionRenderer(state: SpecificState<'sumSelection'>) {
    const exchangeRate = await getExchangeRate(state.context.currency);

    return textWithButtons(`Выберите сумму пополнения в ${state.context.currency}`, [
        AVAILABLE_SUMS.map((sum) => {
            const price = sum.price * exchangeRate;

            return (
                actionButton(`${price.toFixed(2)} (${sum.extraDescription})`, {
                    type: 'SELECT_AMOUNT',
                    price,
                    amount: sum.amount,
                })
            );
        }),
        [actionButton('Назад', { type: 'BACK' })],
    ]);
}

async function readyToDepositRenderer(state: SpecificState<'readyToDeposit'>) {
    const { currency, amount, price } = state.context;

    return textWithButtons(`Вносим ${currency} в объеме ${price}, получаем $${amount}`, [
        [
            actionButton('Все верно', { type: 'OK' }),
            actionButton('Назад', { type: 'BACK' }),
        ],
    ]);
}

async function depositRenderer(state: SpecificState<'deposit'>) {
    const { currency, price, user } = state.context;

    const availableCurrency = AVAILABLE_CURRENCIES.find((data) => (
        data.ticker === currency
    ));

    const handler = availableCurrency && availableCurrency.handler;
    const scheme = availableCurrency && availableCurrency.scheme;

    if (!handler || !scheme) {
        throw new Error('depositRenderer -> `availableCurrency` has wrong data');
    }

    const wallet = await handler(user);

    const url = `${scheme}:${wallet}?amount=${price}`;

    const qrCodeApi = 'https://chart.googleapis.com/chart';
    const qrCodeUrl = `${qrCodeApi}?chs=200x200&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|0`;

    const message = `В течение 15 минут внесите TRX ${price} на адрес ${wallet} [\u200c](${qrCodeUrl})`;

    return textWithButtons(message, [
        [actionButton('Назад', { type: 'BACK' })],
    ]);
}

// ---

type PendingValidationState<StatePart extends UserState = UserState> =
    StatePart extends { value: Record<string, 'pendingValidation'> }
        ? StatePart
        : never;

function isPendingValidationState(
    state: UserState,
): state is PendingValidationState<UserState> {
    return (
        state instanceof Object &&
        Object.values(state.value).includes('pendingValidation')
    );
}
