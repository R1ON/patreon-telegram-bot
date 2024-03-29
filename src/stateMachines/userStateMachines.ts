import { User } from '@prisma/client';
import { createMachine, interpret } from "xstate";

// ---

const ALLOWED_AMOUNT_SELECTION_TIMEOUT = 1000 * 60 * 0.5;

// ---

type UserContext = {
    user: User;
    currency?: string;
    amount?: number;
    price?: number;
    currencySelectionTime?: number;
};

export type UserEvent =
    | { type: 'BACK' | 'OK' | 'BALANCE' | 'RECHARGE' }
    | { type: 'SELECT_CURRENCY'; currency: string }
    | { type: 'SELECT_AMOUNT'; price: number; amount: number };

type ReadyToDepositContext = {
    currency: string;
    amount: number;
    price: number;
};

type WithUniqueRefillRequestValidator<
    T extends string,
    C extends UserContext
> =
    | {
        value: T;
        context: C;
    }
    | {
        value: { [P in StringLiteral<T>]: "pendingValidation" };
        context: C;
    }
    | {
        value: { [P in StringLiteral<T>]: "validationCompleted" };
        context: C;
    };

type BaseState<T extends string, C extends UserContext = UserContext> = { value: T; context: C };

export type UserState =
    | BaseState<'idle'>
    | BaseState<'balance'>
    | WithUniqueRefillRequestValidator<'currencySelection', UserContext>
    | WithUniqueRefillRequestValidator<
        'sumSelection',
        UserContext & { currency: string; currencySelectionTime: number }
    >
    | WithUniqueRefillRequestValidator<'readyToDeposit',UserContext & ReadyToDepositContext>
    | WithUniqueRefillRequestValidator<'deposit', UserContext & ReadyToDepositContext>
    | BaseState<'sumSelectionTimeout', UserContext & ReadyToDepositContext>;

const withUniqRefillRequestValidation = {
    initial: 'pendingValidation',
    states: {
        pendingValidation: {
            invoke: {
                src: 'checkIfRefillRequestExist',
                onDone: 'validationCompleted',
                onError: '#userMachine.idle',
            },
        },
        validationCompleted: {},
    },
};

const userMachine = createMachine<UserContext, UserEvent, UserState>({
    id: 'userMachine',
    predictableActionArguments: true,
    states: {
        idle: {
            on: {
                BALANCE: 'balance',
            },
        },
        balance: {
            on: {
                BACK: 'idle',
                RECHARGE: 'currencySelection',
            },
        }, 
        currencySelection: {
            ...withUniqRefillRequestValidation,
            on: {
                BACK: 'balance',
                SELECT_CURRENCY: {
                    target: 'sumSelection',
                    actions: 'setCurrency',
                },
            },
        },
        sumSelection: {
            entry: 'saveCurrentTime',
            ...withUniqRefillRequestValidation,
            on: {
                BACK: 'currencySelection',
                SELECT_AMOUNT: [{
                    cond: 'amountSelectionExpired',
                    target: 'sumSelectionTimeout',
                }, {
                    target: 'readyToDeposit',
                    actions: 'setAmount',
                }],
            },
        },
        readyToDeposit: {
            ...withUniqRefillRequestValidation,
            on: {
                BACK: 'sumSelection',
                OK: 'deposit',
            },
        },
        deposit: {
            ...withUniqRefillRequestValidation,
            on: {
                BACK: 'readyToDeposit',
            },
        },
        sumSelectionTimeout: {
            on: {
                BACK: 'sumSelection',
            },
        },
    },
}, {
    services: {
        checkIfRefillRequestExist: async (context) => {
            return Promise.resolve(true);
        },
    },
    actions: {
        setCurrency: (context, event) => {
            context.currency = getDataFromEvent('currency', event);
        },
        setAmount: (context, event) => {
            context.amount = getDataFromEvent('amount', event);
            context.price = getDataFromEvent('price', event);
        },
        saveCurrentTime: (context, event) => {
            const time = Date.now();
            context.currencySelectionTime = time;
        },
    },
    guards: {
        amountSelectionExpired: (context) => {
            const now = Date.now();
                    
            return now - context.currencySelectionTime! > ALLOWED_AMOUNT_SELECTION_TIMEOUT;
        },
    },
});

export function processAction(state: UserState, event: UserEvent | null): Promise<UserState> {
    return new Promise((resolve, reject) => {
        const userService = interpret(userMachine.withContext(state.context));
        userService.start(state.value || 'idle');
        
        if (event) {
            userService.send(event);
        }

        userService.subscribe((newState) => {
            if (Object.keys(newState.children).length === 0) {
                resolve(newState as UserState);
            }
        });
    });
}

// ---

type Keys = GetKeysFromUnionWithIgnoreSome<UserEvent, 'type'>;

function getDataFromEvent<T extends Keys>(dataKey: T, event: UserEvent) {
    if (dataKey in event) {
        // @ts-ignore
        return event[dataKey] as NonNullable<UserContext[T]>;
    }

    console.error(`getDataFromEvent -> data ${dataKey} not found in event: `, event);
    return undefined;
}

// ---

type GetKeysFromUnionWithIgnoreSome<T, IgnoreKeys extends string> = T extends Record<string, any>
    ? keyof {
        [i in keyof T as i extends IgnoreKeys ? never : i]: T[i];
    }
    : never;

type StringLiteral<T> =
    T extends string
        ? string extends T
            ? never
            : T
        : never;