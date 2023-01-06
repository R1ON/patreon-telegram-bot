import { createMachine, interpret, StateMachine } from "@xstate/fsm";

// ---

type UserContext = {
    counter: number;
};

export type UserEvent =
    | { type: 'BALANCE' }
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
    context: {
        counter: 0,
    },
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
    userService.subscribe((state) => {
        console.log('incremented');
        state.context.counter++;
    });

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