// @ts-ignore
import {findFilmByID, findFilmByName} from "../kinopoisk.ts";
import axios from "axios";
import {config} from "dotenv";
// @ts-ignore
import {HttpError, TelegramBot} from "../../types/index.ts";
// @ts-ignore
import {botReplies, categories, columns, filters, hashtags, userRequests} from "./dictionary.ts";
// @ts-ignore
import {googleInstance} from "../../app.ts";
// @ts-ignore
import {SaveFilmDialog} from "./dialogs/saveFilmDialog.ts";
// @ts-ignore
import {ShoppingDialog} from "./dialogs/shoppingDialog.ts";
// @ts-ignore
import {WhatToBuyDialog} from "./dialogs/whatToBuyDialog.ts";

config()

const dialogs = {SaveFilmDialog, ShoppingDialog, WhatToBuyDialog}

export class TelegramController {
    hasNeededMeta = false
    messageMeta: TelegramBot.Message = null
    isReplyToBot = false
    activeDialog: any = null

    public async handleNewMessage(message: TelegramBot.Message) {
        this.messageMeta = message && message.entities ? message.entities[0] : null
        this.hasNeededMeta = !!this.messageMeta &&
            (this.messageMeta.type === "bot_command" ||
                this.messageMeta.type === 'mention' && message?.text?.toLowerCase()?.trim().includes(process.env.TELEGRAM_BOT_NAME))
        this.isReplyToBot = message.reply_to_message && message.reply_to_message.from.username && message.reply_to_message.from.username.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME

        const messageText = message?.text?.toLowerCase()?.trim()
        const chatId = message?.chat?.id

        if (messageText && chatId) {
            if (this.hasNeededMeta || this.isReplyToBot) {

                if (!this.activeDialog) {
                    const regex = new RegExp(`@${process.env.TELEGRAM_BOT_NAME!}|/`, "g")
                    const botCommand = messageText.replace(regex, '')

                    this.setActiveDialog(botCommand)
                }

                await this.activeDialog.handleNewMessage(message)
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