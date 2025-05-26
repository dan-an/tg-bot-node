import { config } from 'dotenv';
import { TelegramBot } from '@/types/telegram';
import { SaveFilmDialog } from '@/services/tg/dialogs/saveFilmDialog';
import { ShoppingDialog } from '@/services/tg/dialogs/shoppingDialog';
import { WhatToBuyDialog } from '@/services/tg/dialogs/whatToBuyDialog';
import { AddEventDialog } from '@/services/tg/dialogs/addEventDialog';
import { editMessage, sendMessage, checkAccess } from '@/services/tg/tools';
import { approveUser, rejectUser } from '@/services/db/moderation';

config();

/**
 * Интерфейс, описывающий поведение диалогов.
 */
type DialogInstance = {
    handleNewMessage: (message: TelegramBot.Message) => Promise<void>;
    handleCallbackQuery?: (payload: TelegramBot.CallbackQuery) => Promise<void>;
    on: (event: string, callback: () => void) => void;
};

const dialogs: Record<string, new () => DialogInstance> = {
    SaveFilmDialog,
    ShoppingDialog,
    WhatToBuyDialog,
    AddEventDialog,
};

export class TelegramController {
    hasNeededMeta = false;
    messageMeta: TelegramBot.MessageEntity | null = null;
    isReplyToBot = false;
    activeDialog: any = null;

    public async handleNewMessage(message: TelegramBot.Message) {
        if (!(await checkAccess(message))) return;

        const messageText = message?.text?.toLowerCase()?.trim();
        const chatId = message?.chat?.id;
        if (!messageText || !chatId) return;

        const commandEntity = message.entities?.find((e) => e.type === 'bot_command' && e.offset === 0);
        const mentionEntity = message.entities?.find((e) => e.type === 'mention');

        this.messageMeta = commandEntity ?? mentionEntity ?? null;

        this.hasNeededMeta =
            !!commandEntity ||
            (!!mentionEntity &&
                messageText.slice(mentionEntity.offset, mentionEntity.offset + mentionEntity.length) ===
                    `@${process.env.TELEGRAM_BOT_NAME!.toLowerCase()}`);

        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() ===
            process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const fullCommand = commandEntity
            ? messageText.slice(commandEntity.offset, commandEntity.offset + commandEntity.length)
            : '';
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
                    await this.activeDialog.handleCallbackQuery(payload);
                }
            }
        }
    }

    public async sendMessage(message: TelegramBot.SendMessageParams) {
        await sendMessage(message);
    }

    private setActiveDialog(dialogName: string) {
        const key = Object.keys(dialogs).filter((key) => key.toLowerCase().includes(dialogName))[0];

        if (!key) return;

        this.activeDialog = new dialogs[key]();
        this.activeDialog.on('dialog is over', () => {
            this.activeDialog = null;
        });
    }
}
