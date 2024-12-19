import { config } from 'dotenv';
import { TelegramBot } from '@/types/telegram';
import { SaveFilmDialog } from '@/services/tg/dialogs/saveFilmDialog';
import { ShoppingDialog } from '@/services/tg/dialogs/shoppingDialog';
import { WhatToBuyDialog } from '@/services/tg/dialogs/whatToBuyDialog';
import { AddEventDialog } from '@/services/tg/dialogs/addEventDialog';
import { sendMessage } from '@/services/tg/tools';
import { DialogInstance } from '@/types';
import { DialogFactory } from '@/services/tg/tools/dialogFactory';

config();

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
    activeDialog: DialogInstance | null = null;

    public async handleNewMessage(message: TelegramBot.Message) {
        this.messageMeta = message && message.entities ? message.entities[0] : null;
        this.hasNeededMeta =
            !!this.messageMeta &&
            (this.messageMeta.type === 'bot_command' ||
                (this.messageMeta.type === 'mention' &&
                    !!message?.text?.toLowerCase()?.trim()?.includes(process.env.TELEGRAM_BOT_NAME!)));
        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const messageText = message?.text?.toLowerCase()?.trim();
        const chatId = message?.chat?.id;

        if (messageText && chatId) {
            if (this.activeDialog && this.hasNeededMeta) {
                this.activeDialog = null;
            }

            if (!this.activeDialog) {
                const regex = new RegExp(`@${process.env.TELEGRAM_BOT_NAME!}|/`, 'g');
                const botCommand = messageText.replace(regex, '').trim();

                this.setActiveDialog(botCommand);
            }

            if (this.activeDialog) {
                await this.activeDialog.handleNewMessage(message);
            }
        }
    }

    public async handleCallbackQuery(payload: TelegramBot.CallbackQuery) {
        if (this.activeDialog) {
            await this.activeDialog.handleCallbackQuery(payload);
        }
    }

    public async sendMessage(message: TelegramBot.SendMessageParams) {
        await sendMessage(message);
    }

    private setActiveDialog(dialogName: string) {
        const key = Object.keys(dialogs).filter(key => key.toLowerCase().includes(dialogName))[0]

        if(!key) {
            return
        }

        this.activeDialog = new dialogs[key]()
        this.activeDialog.on('dialog is over', () => {
            this.activeDialog = null;
        });
    }

    private extractCommand(messageText: string): string {
        const botName = process.env.TELEGRAM_BOT_NAME!;
        const regex = new RegExp(`@${botName}|/`, 'g');
        return messageText.replace(regex, '').trim();
    }

    private updateMessageMeta(message: TelegramBot.Message) {
        const firstEntity = message?.entities?.[0];
        this.messageMeta = firstEntity || null;

        this.hasNeededMeta =
            !!this.messageMeta &&
            (this.messageMeta.type === 'bot_command' ||
                (this.messageMeta.type === 'mention' &&
                    message?.text?.toLowerCase()?.includes(process.env.TELEGRAM_BOT_NAME!)));

        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase() ===
            process.env.TELEGRAM_BOT_NAME?.toLowerCase();
    }
}