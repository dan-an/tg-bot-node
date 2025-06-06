import { TelegramBot } from '@/types/telegram';

export const regularMessage: TelegramBot.Message = {
    message_id: 123,
    from: {
        id: 123,
        is_bot: false,
        first_name: 'name',
        username: 'user_name',
        language_code: 'ru',
    },
    chat: {
        id: 123,
        first_name: 'name',
        username: 'user_name',
        type: 'private',
    },
    date: 1748520531,
    text: 'some text',
};

export const commandMessage: TelegramBot.Message = {
    message_id: 123,
    from: {
        id: 123,
        is_bot: false,
        first_name: 'name',
        username: 'user_name',
        language_code: 'ru',
    },
    chat: {
        id: 123,
        first_name: 'name',
        username: 'user_name',
        type: 'private',
    },
    date: 1748520561,
    text: '/command',
    entities: [
        {
            offset: 0,
            length: 9,
            type: 'bot_command',
        },
    ],
};

export const replyMessage: TelegramBot.Message = {
    message_id: 123,
    from: {
        id: 123,
        is_bot: false,
        first_name: 'name',
        username: 'user_name',
        language_code: 'ru',
    },
    chat: {
        id: 123,
        first_name: 'name',
        username: 'user_name',
        type: 'private',
    },
    date: 1748520573,
    reply_to_message: {
        message_id: 123,
        from: {
            id: 6958985597,
            is_bot: true,
            first_name: 'Test secretary bot',
            username: 'BotName',
        },
        chat: {
            id: 123,
            first_name: 'name',
            username: 'user_name',
            type: 'private',
        },
        date: 1748520561,
        text: '#hashtag\nsome_text',
        entities: [
            {
                offset: 0,
                length: 5,
                type: 'hashtag',
            },
        ],
    },
    text: 'some text',
};

export const mentionMessage: TelegramBot.Message = {
    message_id: 123,
    from: {
        id: 123,
        is_bot: false,
        first_name: 'name',
        username: 'user_name',
        language_code: 'ru',
    },
    chat: {
        id: 123,
        first_name: 'name',
        username: 'user_name',
        type: 'private',
    },
    date: 1748523536,
    text: '@BotName some_text',
    entities: [
        {
            offset: 0,
            length: 16,
            type: 'mention',
        },
    ],
};

export const emptyMessage: TelegramBot.Message = {
    message_id: 123,
    from: {
        id: 123,
        is_bot: false,
        first_name: 'name',
        username: 'user_name',
        language_code: 'ru',
    },
    chat: {
        id: 123,
        first_name: 'name',
        username: 'user_name',
        type: 'private',
    },
    date: 1748520531,
    text: '',
};
