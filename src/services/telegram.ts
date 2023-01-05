import { Telegraf } from 'telegraf';
import { Update } from '@grammyjs/types';
import { ExtraEditMessageText, ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { telegramApiKey } from '../config';
import { processAction, UserEvent, UserMachineState, UserState } from '../stateMachines/userStateMachines';
import { User } from '@prisma/client';

type ChatId = number;

const LAST_MESSAGE_IDS = new Map<ChatId, number>();
const FAKE_STATE_HOST = 'https://fake.state.host';

// 02:41:57


// 53:05 { telegram: { webhookReply: false } }
export const bot = new Telegraf(telegramApiKey);

export type RenderResult = {
    message: string;
    extra?: ExtraReplyMessage;
}; 

export function registerRenderer(
    render: (state: UserMachineState) => Promise<RenderResult>,
) {
    bot.use(async (ctx, next) => {
        if (!isMessageUpdate(ctx.update)) {
            return next();
        }

        const chatId = extractChatIdFromMessage(ctx.update);

        if (ctx.update.message) {
            LAST_MESSAGE_IDS.delete(chatId);
        }
    
        const message = // because of node js v12
            ctx.update.callback_query
            && ctx.update.callback_query.message
            && ctx.update.callback_query.message.text;
    
        const userState = restoreUserState(message);
        
        const action = extractActionFromMessage(ctx.update);
        const newState = processAction(userState, action);
        const reaction = await render(newState);
        const augmentedReaction = augmentReactionWithState(reaction, newState);

        return updateUserScreen(chatId, augmentedReaction.message, augmentedReaction.extra as any);
    });
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

export function restoreUserState(text: string | undefined): UserState {
    return { value: 'idle', context: {} };
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
): RenderResult {
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
    extra?: ExtraEditMessageText,
) {
    const lastMessageId = LAST_MESSAGE_IDS.get(chatId);

    if (lastMessageId) {
        return bot.telegram.editMessageText(chatId, lastMessageId, undefined, message, extra);
    }
    
    const result = await bot.telegram.sendMessage(chatId, message, extra);
    LAST_MESSAGE_IDS.set(chatId, result.message_id);

    return result;
}

function isMessageUpdate(update: unknown): update is Update {
    return Boolean(update);
}