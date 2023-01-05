import { createMachine, interpret, StateMachine } from "@xstate/fsm";

// ---

type UserContext = {
};

export type UserEvent =
    | { type: 'BALANCE'; id: string }
    | { type: 'BACK' };

export type UserState =
    | {
        value: 'idle';
        context: UserContext;
    }
    | {
        value: 'balance';
        context: UserContext;
    };

const userMachine = createMachine<UserContext, UserEvent, UserState>({
    initial: 'idle',
    states: {
        idle: {
            on: {
                BALANCE: 'balance',
            },
        },
        balance: {
            on: {
                BACK: 'idle',
            },
        },
    },
});

export type UserMachineState = StateMachine.State<UserContext, UserEvent, UserState>;

export function processAction(state: UserState, event: UserEvent | null) {
    const userService = interpret(userMachine);

    userService.start(state);
    
    if (event) {
        userService.send(event);
    }

    return userService.state;
}



// userService.subscribe((state) => {
// if (state.matches('success')) {
//     // from UserState, `user` will be defined
//     state.context.user.name;
// }
// });