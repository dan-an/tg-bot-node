import {config} from "dotenv";
import {TelegramBot} from "@/types/telegram";
import {SaveFilmDialog} from "@/services/tg/dialogs/saveFilmDialog"
import {ShoppingDialog} from "@/services/tg/dialogs/shoppingDialog";
import {WhatToBuyDialog} from "@/services/tg/dialogs/whatToBuyDialog";

config()

type DialogInstance = {
    handleNewMessage: (message: TelegramBot.Message) => Promise<void>;
    handleCallbackQuery?: (payload: TelegramBot.CallbackQuery) => Promise<void>;
    on: (event: string, callback: () => void) => void;
};

const dialogs: Record<string, new () => DialogInstance> = {
    SaveFilmDialog,
    ShoppingDialog,
    WhatToBuyDialog,
};

export class TelegramController {
    hasNeededMeta = false
    messageMeta: TelegramBot.MessageEntity | null = null;
    isReplyToBot = false
    activeDialog: any = null

    public async handleNewMessage(message: TelegramBot.Message) {
        this.messageMeta = message && message.entities ? message.entities[0] : null;
        this.hasNeededMeta =
            !!this.messageMeta &&
            (this.messageMeta.type === "bot_command" ||
                (this.messageMeta.type === "mention" &&
                    !!message?.text?.toLowerCase()?.trim()?.includes(process.env.TELEGRAM_BOT_NAME!)));
        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const messageText = message?.text?.toLowerCase()?.trim();
        const chatId = message?.chat?.id;

        if (messageText && chatId) {
            // Проверяем, есть ли активный диалог и вводится ли новая команда
            if (this.activeDialog && this.hasNeededMeta) {
                console.log(`Ending current dialog: ${this.activeDialog.constructor.name}`);
                this.activeDialog = null; // Сброс текущего активного диалога
            }

            if (!this.activeDialog) {
                const regex = new RegExp(`@${process.env.TELEGRAM_BOT_NAME!}|/`, "g");
                const botCommand = messageText.replace(regex, '').trim();

                console.log(`Setting new dialog: ${botCommand}`);
                this.setActiveDialog(botCommand);
            }

            // Если есть активный диалог, передаем управление ему
            if (this.activeDialog) {
                await this.activeDialog.handleNewMessage(message);
            } else {
                console.log(`No dialog found for message: ${messageText}`);
            }
        }
    }

    public async handleCallbackQuery(payload: TelegramBot.CallbackQuery) {
        if (this.activeDialog) {
            await this.activeDialog.handleCallbackQuery(payload)
        }
    }

    private setActiveDialog(dialogName: string) {
        const key = Object.keys(dialogs).filter(key => key.toLowerCase().includes(dialogName))[0]
        // @ts-ignore
        this.activeDialog = new dialogs[key]()
        this.activeDialog.on('dialog is over', () => {
            this.activeDialog = null
        })
    }
}