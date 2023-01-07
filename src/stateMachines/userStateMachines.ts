import { User } from '@prisma/client';
import { createMachine, interpret, StateMachine } from "@xstate/fsm";
import { InitEvent } from '@xstate/fsm/lib/types';

// ---

type UserContext = {
    user: User;
    currency?: string;
    amount?: number;
    price?: number;
};

export type UserEvent =
    | { type: 'BACK' | 'OK' | 'BALANCE' | 'RECHARGE' }
    | { type: 'SELECT_CURRENCY'; currency: string }
    | { type: 'SELECT_AMOUNT'; price: number; amount: number };

export type UserState =
    | {
        value: 'idle' | 'balance' | 'currencySelection';
        context: UserContext;
    }
    | {
        value: 'sumSelection';
        context: UserContext & { currency: string };
    }
    | {
        value: 'readyToDeposit' | 'deposit';
        context: UserContext & { currency: string; amount: number; price: number };
    };

export type UserMachineState = StateMachine.State<UserContext, UserEvent, UserState>;

export function processAction(state: UserState, event: UserEvent | null) {
    const userMachine = createMachine<UserContext, UserEvent, UserState>({
        initial: state.value || 'idle',
        context: state.context,
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
                on: {
                    BACK: 'balance',
                    SELECT_CURRENCY: {
                        target: 'sumSelection',
                        actions: 'setCurrency',
                    },
                },
            },
            sumSelection: {
                on: {
                    BACK: 'currencySelection',
                    SELECT_AMOUNT: {
                        target: 'readyToDeposit',
                        actions: 'setAmount',
                    },
                },
            },
            readyToDeposit: {
                on: {
                    BACK: 'currencySelection',
                    OK: 'deposit',
                },
            },
            deposit: {
                on: {
                    BACK: 'readyToDeposit',
                },
            },
        },
    }, {
        actions: {
            setCurrency: (context, event) => {
                context.currency = getDataFromEvent('currency', event);
            },
            setAmount: (context, event) => {
                context.amount = getDataFromEvent('amount', event);
                context.price = getDataFromEvent('price', event);
            },
        },
    });

    const userService = interpret(userMachine);
    userService.start();
    
    if (event) {
        userService.send(event);
    }

    return userService.state;
}

// ---

type Keys = GetKeysFromUnionWithIgnoreSome<UserEvent, 'type'>;

function getDataFromEvent<T extends Keys>(dataKey: T, event: InitEvent | UserEvent) {
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