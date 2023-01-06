import { request as fetch } from 'undici';
import {
    Update,
    Message,
    MessageEntity,
    InlineKeyboardMarkup,
    ParseMode,
    InlineKeyboardButton,
    Params,
    InputFileProxy,
    ApiResponse,
} from '@grammyjs/types';
import { RouteHandler } from 'fastify';
import { telegramApiKey } from '../config';
import { processAction, UserEvent, UserMachineState, UserState } from '../stateMachines/userStateMachines';

// ---

type ChatId = number;

const LAST_MESSAGE_IDS = new Map<ChatId, number>();
const FAKE_STATE_HOST = 'https://fake.state.host';

// ---

export type RenderResult = {
    message: string;
    extra?: { reply_markup?: Partial<InlineKeyboardMarkup> };
}; 

export function registerRenderer(
    render: (state: UserMachineState) => Promise<RenderResult>,
): RouteHandler {
    return async (req, res) => {
        res.send({ success: true });

        // TODO add runtypes
        const ctx: Update = req.body as any;
        
        if (!isMessageUpdate(ctx)) {
            return;
        }

        try {
            const chatId = extractChatIdFromMessage(ctx);

            if (ctx.message) {
                LAST_MESSAGE_IDS.delete(chatId);
            }
        
            const message = ctx.callback_query && ctx.callback_query.message;
        
            const userState = restoreUserState(message);
            
            const action = extractActionFromMessage(ctx);
            const newState = processAction(userState, action);
            const reaction = await render(newState);
            const augmentedReaction = augmentReactionWithState(reaction, newState);
    
            return updateUserScreen(chatId, augmentedReaction.message, augmentedReaction.extra as any);
        }
        catch(error) {
            console.error('registerRenderer error: ', error);
        }
    };
}

export function extractChatIdFromMessage(update: Update): ChatId {
    if (update.message) {
        return update.message.chat.id;
    }

    if (update.callback_query && update.callback_query.message) {
        return update.callback_query.message.chat.id;
    }

    throw new Error('Failure to extact chat id');
}

const DEFAULT_STATE = { value: 'idle', context: { counter: 0 } } as const;

export function restoreUserState(message: Message | undefined): UserState {
    if (!message) {
        return DEFAULT_STATE;
    }
    
    const stateUrl = (message.entities || []).find((message) => (
        message.type === 'text_link' && message.url.startsWith(FAKE_STATE_HOST)
    ));

    if (!isTextLinkMessageEntity(stateUrl)) {
        return DEFAULT_STATE;
    }

    const state = JSON.parse(
        Buffer.from(
            stateUrl.url.substring(`${FAKE_STATE_HOST}/`.length),
            'base64',
        ).toString()
    );

    console.log('restoredState', state);

    return state;
}

function isTextLinkMessageEntity(
    message?: MessageEntity,
): message is MessageEntity.TextLinkMessageEntity {
    return message ? message.type === 'text_link' : false;
}

export function extractActionFromMessage(update: Update): UserEvent | null {
    if (update.callback_query) {
        return JSON.parse(update.callback_query.data || '') as UserEvent;
    }

    if (update.message && update.message.text && update.message.text.startsWith('/')) {
        return { type: update.message.text.substring(1).toUpperCase() } as UserEvent;
    }

    return null;
}

let messageId = 0;
function augmentReactionWithState(
    { message, extra = {} }: RenderResult,
    state: UserMachineState,
): RenderResult & { extra: { parse_mode: ParseMode } } {
    const serialized_state = Buffer.from(
        JSON.stringify({ ...state, _id: messageId })
    ).toString('base64');

    const augmentedMessage = `${message} [serialized](${FAKE_STATE_HOST}/${serialized_state})`;

    messageId++;

    return {
        message: augmentedMessage,
        extra: {
            ...extra,
            parse_mode: 'MarkdownV2',
        },
    };
}

export async function updateUserScreen(
    chatId: ChatId,
    message: string,
    extra?: { reply_markup: InlineKeyboardMarkup  },
) {
    const lastMessageId = LAST_MESSAGE_IDS.get(chatId);

    if (lastMessageId) {
        return callTelegramMethod('editMessageText', {
            chat_id: chatId,
            message_id: lastMessageId,
            text: message,
            ...extra,
        });
    }
    
    const apiResponse = await callTelegramMethod('sendMessage', {
        chat_id: chatId,
        text: message,
        ...extra,
    });

    if (apiResponse.ok) {
        LAST_MESSAGE_IDS.set(chatId, apiResponse.result.message_id);
    }

    return apiResponse;
}

function isMessageUpdate(update: unknown): update is Update {
    return Boolean(update);
}

// ---

export function actionButton(
    text: string,
    action: UserEvent,
): InlineKeyboardButton.CallbackButton {
    return {
        text,
        callback_data: JSON.stringify(action),
    };
}

// ---

const TELEGRAM_BASE_URL = `https://api.telegram.org/bot${telegramApiKey}`;
type SetWebhookParams = Params<'setWebhook', unknown>[0];

function callTelegramMethod<T extends keyof InputFileProxy<F>['Telegram'], F>(
    method: T,
    payload: Params<T, F>[0],
): Promise<ApiResponse<ReturnType<InputFileProxy<F>['Telegram'][T]>>> {
    return fetch(`${TELEGRAM_BASE_URL}/${method}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then((value) => value.body.json());
}

export function setWebhook(url: string) {
    return callTelegramMethod('setWebhook', { url })
}
