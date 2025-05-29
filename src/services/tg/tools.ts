/**
 * Утилиты для взаимодействия с Telegram Bot API.
 * Содержит функции отправки и редактирования сообщений, генерации случайных фраз,
 * а также проверки доступа пользователей (механизм модерации).
 */

import { TelegramBot } from '@/types/telegram';
import axios from 'axios';

const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`;

/**
 * Отправляет сообщение пользователю через Telegram Bot API.
 *
 * @param message - Объект параметров для отправки сообщения (chat_id, text и т.д.)
 */
export const sendMessage = async (message: TelegramBot.SendMessageParams): Promise<void> => {
    await axios.post(`${telegramUrl}/sendMessage`, message);
};

/**
 * Редактирует ранее отправленное сообщение через Telegram Bot API.
 *
 * @param messageId - ID сообщения, которое нужно изменить
 * @param params - Новый текст и параметры (chat_id, text, reply_markup и т.д.)
 */
export const editMessage = async (messageId: number, params: TelegramBot.SendMessageParams): Promise<void> => {
    try {
        await axios.post(`${telegramUrl}/editMessageText`, {
            chat_id: params.chat_id,
            message_id: messageId,
            text: params.text,
            parse_mode: params.parse_mode,
            reply_markup: params.reply_markup,
        });
    } catch (error) {
        console.error('Ошибка редактирования сообщения:', error);
    }
};

/**
 * Извлекает метаинформацию из сообщения Telegram о том, содержит ли оно команду
 * или упоминание бота, и определяет, адресовано ли сообщение текущему боту.
 *
 * Функция обрабатывает два типа сущностей в сообщении:
 * - `bot_command`: команда, начинающаяся с `/`, например `/start`
 * - `mention`: упоминание в виде `@botname`, например `@my_telegram_bot`
 *
 * Возвращает объект, содержащий:
 * - `meta`: сущность команды или упоминания, если она найдена
 * - `isAddressedToBot`: `true`, если сообщение явно адресовано этому боту
 *
 * @param message — Объект сообщения от Telegram с полем `entities` и `text`
 * @param botName — Имя бота (в нижнем регистре), например `'my_telegram_bot'`
 *
 * @returns Объект с полями:
 * - `meta`: сущность команды или упоминания (`MessageEntity`), либо `null`
 * - `isAddressedToBot`: `true`, если сообщение содержит команду или
 *    упоминание текущего бота, иначе `false`
 */
export const resolveMessageMeta = (
    message: TelegramBot.Message,
    botName: string,
): {
    meta: TelegramBot.MessageEntity | null;
    isAddressedToBot: boolean;
} => {
    if (!message.text) {
        return { meta: null, isAddressedToBot: false };
    }

    const messageText = message.text.toLowerCase().trim();
    const commandEntity = message.entities?.find((e) => e.type === 'bot_command' && e.offset === 0);
    const mentionEntity = message.entities?.find((e) => e.type === 'mention');
    const meta = commandEntity ?? mentionEntity ?? null;
    const isAddressedToBot =
        !!commandEntity ||
        (!!mentionEntity &&
            messageText.slice(mentionEntity.offset, mentionEntity.offset + mentionEntity.length) === `@${botName}`);

    return { meta, isAddressedToBot };
};
