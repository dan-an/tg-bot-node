/**
 * Утилиты для взаимодействия с Telegram Bot API.
 * Содержит функции отправки и редактирования сообщений, генерации случайных фраз,
 * а также проверки доступа пользователей (механизм модерации).
 */

import { TelegramBot } from '@/types/telegram';
import axios from 'axios';
import { getUserStatus, addPendingUser } from '@/services/db/moderation';

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
 * Возвращает случайную строку из списка.
 *
 * @param phraseList - Массив строк, из которых нужно выбрать случайную
 * @returns Одна из строк массива
 */
export const getRandomPhrase = (phraseList: string[]): string => {
    return phraseList[Math.floor(Math.random() * phraseList.length)];
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
 * Проверяет статус пользователя и решает, может ли он продолжить работу с ботом.
 *
 * - Если пользователь одобрен (`approved`) — возвращает true.
 * - Если `pending` или `rejected` — отправляет уведомление пользователю.
 * - Если новый — добавляет в базу, уведомляет пользователя и отправляет уведомление администратору.
 *
 * @param message - Входящее сообщение от Telegram с полем `from`
 * @returns true — если пользователь одобрен, иначе false
 */
export const checkAccess = async (message: TelegramBot.Message): Promise<boolean> => {
    if (!message.from) return false;

    const from = message.from;
    const status = getUserStatus(from.id);

    const messageToSend: Partial<TelegramBot.SendMessageParams> = {
        chat_id: from.id,
    };

    switch (status) {
        case 'approved':
            return true;

        case 'rejected':
            messageToSend.text = '🚫 Доступ к боту запрещён.';
            break;

        case 'pending':
            messageToSend.text = '⏳ Ваша заявка на доступ рассматривается.';
            break;

        default:
            addPendingUser(from);
            messageToSend.text = '⏳ Ваша заявка на доступ отправлена администратору.';

            await sendMessage({
                chat_id: Number(process.env.ADMIN_ID),
                text: `👤 Новый пользователь:\nИмя: ${from.first_name}\nID: ${from.id}\nUsername: ${from.username ?? '—'}\n\nРазрешить доступ?`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '✅ Да',
                                callback_data: JSON.stringify({ command: 'approve', user_id: from.id }),
                            },
                            {
                                text: '❌ Нет',
                                callback_data: JSON.stringify({ command: 'reject', user_id: from.id }),
                            },
                        ],
                    ],
                },
            });
    }

    if (messageToSend.chat_id && messageToSend.text) {
        await sendMessage(messageToSend as TelegramBot.SendMessageParams);
    }

    return false;
};
