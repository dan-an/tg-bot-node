/**
 * Основной контроллер Telegram-бота.
 *
 * Отвечает за:
 * - маршрутизацию входящих сообщений,
 * - управление активными диалогами,
 * - проверку доступа новых пользователей (модерация),
 * - обработку callback-запросов от inline-кнопок.
 */

import { config } from 'dotenv';
import { TelegramBot } from '@/types/telegram';
import { SaveFilmDialog } from '@/services/tg/dialogs/saveFilmDialog';
import { ShoppingDialog } from '@/services/tg/dialogs/shoppingDialog';
import { WhatToBuyDialog } from '@/services/tg/dialogs/whatToBuyDialog';
import { AddEventDialog } from '@/services/tg/dialogs/addEventDialog';
import { editMessage, resolveMessageMeta, sendMessage } from '@/services/tg/tools';
import { checkAccess } from '@/services/tg/sqlTools';
import { approveUser, rejectUser } from '@/services/db/moderation';

config();

/**
 * Интерфейс, описывающий поведение диалога.
 */
type DialogInstance = {
    handleNewMessage: (message: TelegramBot.Message) => Promise<void>;
    handleCallbackQuery?: (payload: TelegramBot.CallbackQuery) => Promise<void>;
    on: (event: string, callback: () => void) => void;
};

/**
 * Доступные диалоги, подключаемые по командам.
 */
const dialogs: Record<string, new () => DialogInstance> = {
    SaveFilmDialog,
    ShoppingDialog,
    WhatToBuyDialog,
    AddEventDialog,
};

export class TelegramController {
    /** Метаданные команды / упоминания в сообщении */
    messageMeta: TelegramBot.MessageEntity | null = null;

    /** Признак того, что сообщение содержит команду или @упоминание бота */
    hasNeededMeta = false;

    /** Признак того, что сообщение — это ответ на сообщение от бота */
    isReplyToBot = false;

    /** Активный диалог, если он есть */
    activeDialog: DialogInstance | null = null;

    /**
     * Обрабатывает новое входящее сообщение от Telegram.
     * Выполняет:
     * - проверку авторизации (`checkAccess`);
     * - маршрутизацию команды в нужный диалог;
     * - обработку команды `/cancel`.
     *
     * @param message Сообщение от пользователя
     */
    public async handleNewMessage(message: TelegramBot.Message) {
        if (!(await checkAccess(message))) return;

        const botName = process.env.TELEGRAM_BOT_NAME!.toLowerCase();
        const messageText = message?.text?.toLowerCase()?.trim();
        const chatId = message?.chat?.id;
        if (!messageText || !chatId) return;

        const { meta, isAddressedToBot } = resolveMessageMeta(message, botName);

        this.messageMeta = meta;
        this.hasNeededMeta = isAddressedToBot;

        this.isReplyToBot = message.reply_to_message?.from?.username?.toLowerCase()?.trim() === botName;

        const fullCommand =
            meta?.type === 'bot_command' ? messageText.slice(meta.offset, meta.offset + meta.length) : '';
        const commandName = fullCommand.split('@')[0];

        if (commandName === '/cancel') {
            if (this.activeDialog) {
                await sendMessage({
                    chat_id: chatId,
                    text: 'Ты точно хочешь отменить текущий диалог?',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Да',
                                    callback_data: JSON.stringify({ command: 'confirmCancel', confirm: true }),
                                },
                                {
                                    text: 'Нет',
                                    callback_data: JSON.stringify({ command: 'confirmCancel', confirm: false }),
                                },
                            ],
                        ],
                    },
                });
            } else {
                await sendMessage({ chat_id: chatId, text: 'У тебя сейчас нет активного диалога.' });
            }
            return;
        }

        if (this.hasNeededMeta) {
            if (this.activeDialog) {
                this.activeDialog = null;
            }

            const botCommandName = commandName.replace('/', '').trim();
            this.setActiveDialog(botCommandName);

            if (this.activeDialog) {
                await this.activeDialog.handleNewMessage(message);
            }
        }
    }

    /**
     * Обрабатывает входящий callback-запрос из inline-кнопок.
     * Включает поддержку:
     * - подтверждения отмены диалога;
     * - модерации доступа: одобрение / отклонение.
     *
     * @param payload Объект callback_query от Telegram
     */
    public async handleCallbackQuery(payload: TelegramBot.CallbackQuery) {
        const chatId = payload.message!.chat.id;
        const messageId = payload.message!.message_id;
        if (!payload.data) return;

        let parsed: { command?: string; user_id?: string; [key: string]: any };
        try {
            parsed = JSON.parse(payload.data);
        } catch {
            return;
        }

        switch (parsed.command) {
            case 'approve': {
                const userId = Number(parsed.user_id);
                approveUser(userId);
                await sendMessage({ chat_id: userId, text: '✅ Вы были одобрены. Добро пожаловать!' });
                await sendMessage({ chat_id: chatId, text: `Пользователь ${userId} одобрен.` });
                break;
            }

            case 'reject': {
                const userId = Number(parsed.user_id);
                rejectUser(userId);
                await sendMessage({ chat_id: userId, text: '🚫 В доступе отказано.' });
                await sendMessage({ chat_id: chatId, text: `Пользователь ${userId} отклонён.` });
                break;
            }

            case 'confirmCancel': {
                if (parsed.confirm) {
                    this.activeDialog = null;
                    await editMessage(messageId, {
                        chat_id: chatId,
                        text: 'Диалог отменён. Можем начать заново.',
                    });
                } else {
                    await editMessage(messageId, {
                        chat_id: chatId,
                        text: 'Окей, продолжаем текущий диалог.',
                    });
                }
                break;
            }

            default: {
                if (this.activeDialog) {
                    await this.activeDialog.handleCallbackQuery?.(payload);
                }
            }
        }
    }

    /**
     * Обёртка для отправки сообщения пользователю.
     *
     * @param message параметры для Telegram API
     */
    public async sendMessage(message: TelegramBot.SendMessageParams) {
        await sendMessage(message);
    }

    /**
     * Активирует диалог по имени команды.
     * Поддерживает `on("dialog is over")` для сброса текущего диалога.
     *
     * @param dialogName Название команды (без "/")
     */
    private setActiveDialog(dialogName: string) {
        const key = Object.keys(dialogs).filter((key) => key.toLowerCase().includes(dialogName))[0];

        if (!key) return;

        this.activeDialog = new dialogs[key]();
        this.activeDialog.on('dialog is over', () => {
            this.activeDialog = null;
        });
    }
}
