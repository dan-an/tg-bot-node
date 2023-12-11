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

config()

const dialogs = {SaveFilmDialog, ShoppingDialog}

export class TelegramController {
    telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`
    activeHashtag = ''
    shoppingList: string[] = []
    filterColumn = ''
    filterValue = ''
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
                // const reply: messageData = {
                //     chat_id: chatId,
                // }

                if (!this.activeDialog) {
                    const regex = new RegExp(`@${process.env.TELEGRAM_BOT_NAME!}|/`, "g")
                    const botCommand = messageText.replace(regex, '')

                    this.setActiveDialog(botCommand)
                }

                await this.activeDialog.handleNewMessage(message)


                // if (userRequests.save.some((keyWord: string) => messageText.includes(keyWord))) {
                //     await this.activeDialog.handleNewMessage(message)
                // }
                // if (userRequests.shoplist.some((keyWord: string) => messageText.includes(keyWord))) {
                //     this.activeHashtag = hashtags.SHOPPING
                //     reply.text = `#${this.activeHashtag}\n${this.getRandomPhrase(botReplies.forceUser)}`
                // }
                // if (userRequests.getList.some((keyWord: string) => messageText.includes(keyWord))) {
                //     this.activeHashtag = hashtags.GETLIST
                //
                //     const keyboard = {
                //         inline_keyboard: (Object.entries(filters) as string[][]).reduce<{
                //             text: string, callback_data: string
                //         }[][]>((keyboard, column: string[]) => {
                //             if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                //                 keyboard.push([])
                //             }
                //
                //             if (keyboard.at(-1)!.length < 2) {
                //                 keyboard.at(-1)!.push({
                //                     text: column[1],
                //                     callback_data: JSON.stringify({
                //                         type: "filterColumn",
                //                         data: column[1] !== filters.NONE ? column[0] : ''
                //                     })
                //                 })
                //             }
                //
                //             return keyboard
                //         }, []),
                //     }
                //
                //     reply.text = botReplies.askFilter[0]
                //     reply.reply_markup = JSON.stringify(keyboard)
                // }
                //
                // reply.parse_mode = "HTML"
                //
                // await this.sendMessage(reply)
            }
            // else if (this.isReplyToBot) {
            // await this.activeDialog.handleNewMessage(message)
            // this.activeHashtag = this.getHashtag(message.reply_to_message.text)
            // const reply: messageData = {
            //     chat_id: chatId,
            // }
            //
            // let keyboard = {}
            //
            // switch (this.activeHashtag) {
            //     case hashtags.FILMS:
            //         //saveFilmDialog here
            //         break
            //     case hashtags.SHOPPING:
            //         this.shoppingList = messageText.split('\n')
            //
            //         keyboard = {
            //             inline_keyboard: (Object.values(categories) as string[]).reduce<{
            //                 text: string, callback_data: string
            //             }[][]>((keyboard, category: string) => {
            //                 if (!keyboard.length || keyboard.at(-1)!.length === 2) {
            //                     keyboard.push([])
            //                 }
            //
            //                 if (keyboard.at(-1)!.length < 2) {
            //                     keyboard.at(-1)!.push({
            //                         text: category,
            //                         callback_data: JSON.stringify({type: "filterValue", data: category})
            //                     })
            //                 }
            //
            //                 return keyboard
            //             }, []),
            //         }
            //
            //         reply.text = botReplies.askCategory[0]
            //         reply.reply_markup = JSON.stringify(keyboard)
            //
            //         await this.sendMessage(reply)
            //         break
            //     case hashtags.GETLIST:
            //         break
            // }
            // }
        }
    }

    public async handleCallbackQuery(payload: TelegramBot.CallbackQuery) {
        if (this.activeDialog) {
            await this.activeDialog.handleCallbackQuery(payload)
        }

        // const {message} = payload
        //
        // const chatId = message?.chat?.id
        //
        // if (payload.data) {
        //     const reply: messageData = {
        //         chat_id: chatId,
        //         text: '',
        //         parse_mode: "HTML",
        //     }
        //
        //     const parsedPayload = JSON.parse(payload.data)
        //
        //     switch (this.activeHashtag) {
        //         case hashtags.FILMS:
        //             const film = await findFilmByID(parsedPayload.data)
        //             await googleInstance.addRow(parseInt(process.env.FILMS_SHEET_ID!), [film.name, `https://www.kinopoisk.ru/film/${film.id}/`, film.id])
        //
        //             reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}`
        //
        //             break
        //         case hashtags.SHOPPING:
        //             const rows: string[][] = this.shoppingList.map(item => [item, parsedPayload.data])
        //
        //             await googleInstance.addRows(parseInt(process.env.SHOPPING_SHEET_ID!), rows)
        //             this.shoppingList = []
        //
        //             reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}/edit#gid=${process.env.SHOPPING_SHEET_ID}`
        //
        //             break
        //         case hashtags.GETLIST:
        //             if (parsedPayload.type) {
        //                 switch (parsedPayload.type) {
        //                     case "filterColumn":
        //                         this.filterColumn = parsedPayload.data ? filters[parsedPayload.data] : ""
        //
        //                         if (!this.filterColumn) {
        //                             break
        //                         }
        //
        //                         reply.text = 'Отлично, что выберем?'
        //                         reply.reply_markup = {
        //                             inline_keyboard: (Object.values(categories) as string[]).reduce<{
        //                                 text: string, callback_data: string
        //                             }[][]>((keyboard, category: string) => {
        //                                 if (!keyboard.length || keyboard.at(-1)!.length === 2) {
        //                                     keyboard.push([])
        //                                 }
        //
        //                                 if (keyboard.at(-1)!.length < 2) {
        //                                     keyboard.at(-1)!.push({
        //                                         text: category, callback_data: JSON.stringify({
        //                                             type: 'filterValue',
        //                                             data: category
        //                                         })
        //                                     })
        //                                 }
        //
        //                                 return keyboard
        //                             }, []),
        //                         }
        //                         await this.sendMessage(reply)
        //                         return
        //                     case "filterValue":
        //                         this.filterValue = parsedPayload.data
        //                 }
        //             }
        //             const shopItems = await googleInstance.getRows(process.env.SHOPPING_SHEET_ID, this.filterColumn, this.filterValue)
        //
        //             const formattedList = shopItems.map((item: any) => {
        //                 return `    - ${item[columns.NAME]}`
        //             })
        //
        //             reply.text = `<b>Надо купить: </b>\n${formattedList.join('\n')}`
        //
        //             break
        //     }
        //
        //     await this.sendMessage(reply)
        // }
    }

    private getHashtag(messageText: string): string {
        const regex = /#(.+)/;
        const match = messageText.match(regex);

        return match![1]
    }

    private getRandomPhrase(phraseList: string[]): string {
        return phraseList[Math.floor(Math.random() * phraseList.length)]
    }

    private async sendMessage(message: {
        chatId: TelegramBot.ChatId,
        text: string,
        options?: TelegramBot.SendMessageOptions
    }): Promise<TelegramBot.Message> {
        await axios.post(`${this.telegramUrl}/sendMessage`, message)
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