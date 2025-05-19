import { config } from 'dotenv';
import { TelegramBot } from '@/types/telegram';
import { SaveFilmDialog } from '@/services/tg/dialogs/saveFilmDialog';
import { ShoppingDialog } from '@/services/tg/dialogs/shoppingDialog';
import { WhatToBuyDialog } from '@/services/tg/dialogs/whatToBuyDialog';
import { AddEventDialog } from '@/services/tg/dialogs/addEventDialog';
import { editMessage, sendMessage } from '@/services/tg/tools';

config();

/**
 * Интерфейс, описывающий поведение диалогов.
 * Каждый диалог должен уметь:
 * - Обрабатывать новые сообщения
 * - (Опционально) обрабатывать callbackQuery
 * - Эмитить события, такие как "dialog is over"
 */
type DialogInstance = {
    handleNewMessage: (message: TelegramBot.Message) => Promise<void>;
    handleCallbackQuery?: (payload: TelegramBot.CallbackQuery) => Promise<void>;
    on: (event: string, callback: () => void) => void;
};

// Карта всех доступных диалогов по их ключам (названиям команд)
const dialogs: Record<string, new () => DialogInstance> = {
    SaveFilmDialog,
    ShoppingDialog,
    WhatToBuyDialog,
    AddEventDialog,
};

/**
 * Основной контроллер Telegram-бота.
 * Отвечает за маршрутизацию входящих сообщений и callback-запросов,
 * управление активным сценарием, а также отправку сообщений пользователю.
 */
export class TelegramController {
    /**
     * Признак того, что сообщение содержит bot-команду или @упоминание бота.
     */
    hasNeededMeta = false;
    messageMeta: TelegramBot.MessageEntity | null = null;
    /**
     * Признак того, что сообщение — это ответ на сообщение бота.
     */
    isReplyToBot = false;
    activeDialog: any = null;

    public async handleNewMessage(message: TelegramBot.Message) {
        const messageText = message?.text?.toLowerCase()?.trim();
        const chatId = message?.chat?.id;

        if (!messageText || !chatId) return;

        const commandEntity = message.entities?.find((e) => e.type === 'bot_command' && e.offset === 0);
        const mentionEntity = message.entities?.find((e) => e.type === 'mention');

        /**
         * Первая подходящая entity из сообщения: bot_command или mention.
         */
        this.messageMeta = commandEntity ?? mentionEntity ?? null;

        /**
         * Признак того, что сообщение содержит bot-команду или @упоминание бота.
         */
        this.hasNeededMeta =
            !!commandEntity ||
            (!!mentionEntity &&
                messageText.slice(mentionEntity.offset, mentionEntity.offset + mentionEntity.length) ===
                    `@${process.env.TELEGRAM_BOT_NAME!.toLowerCase()}`);

        /**
         * Признак того, что сообщение — это ответ на сообщение бота.
         */
        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() ===
            process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const fullCommand = commandEntity
            ? messageText.slice(commandEntity.offset, commandEntity.offset + commandEntity.length)
            : '';
        const commandName = fullCommand.split('@')[0]; // "/cancel" — без @botname

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
                                    callback_data: JSON.stringify({ type: 'confirmCancel', confirm: true }),
                                },
                                {
                                    text: 'Нет',
                                    callback_data: JSON.stringify({ type: 'confirmCancel', confirm: false }),
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

            const botCommandName = commandName.replace('/', '').trim(); // для setActiveDialog
            this.setActiveDialog(botCommandName);

            if (this.activeDialog) {
                await this.activeDialog.handleNewMessage(message);
            }
        }
    }

    public async handleCallbackQuery(payload: TelegramBot.CallbackQuery) {
        const chatId = payload.message!.chat.id;
        const messageId = payload.message!.message_id;

        if (!payload.data) return;

        const parsed = JSON.parse(payload.data);

        // Подтверждение отмены диалога по inline-кнопке
        if (parsed.type === 'confirmCancel') {
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
            return; // завершить обработку callback
        }

        if (this.activeDialog) {
            await this.activeDialog.handleCallbackQuery(payload);
        }
    }

    public async sendMessage(message: TelegramBot.SendMessageParams) {
        await sendMessage(message);
    }

    private setActiveDialog(dialogName: string) {
        const key = Object.keys(dialogs).filter((key) => key.toLowerCase().includes(dialogName))[0];

        if (!key) {
            return;
        }

        // Создаём новый экземпляр диалога и подписываемся на событие завершения
        this.activeDialog = new dialogs[key]();
        this.activeDialog.on('dialog is over', () => {
            this.activeDialog = null;
        });
    }
}
