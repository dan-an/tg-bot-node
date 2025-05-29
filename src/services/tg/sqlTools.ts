import { TelegramBot } from '@/types/telegram';
import { addPendingUser, getUserStatus } from '@/services/db/moderation';
import { sendMessage } from '@/services/tg/tools';

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
                chat_id: Number(process.env.TELEGRAM_ADMIN_ID),
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
