// @ts-ignore
import {findFilmByName, findFilmByID} from "../kinopoisk.ts";
import axios from "axios";
import {config} from "dotenv";
// @ts-ignore
import {HttpError, messageData} from "../../types/index.ts";
import * as process from "process";
// @ts-ignore
import {botReplies, userRequests, hashtags, categories, filters, columns} from "./dictionary.ts";
// @ts-ignore
import {googleInstance} from "../../app.ts";
// @ts-ignore
import {TelegramBot} from "../../types/index.ts";


config()

export class TelegramController {
    telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`
    activeHashtag = ''
    shoppingList: string[] = []
    filterColumn = ''
    filterValue = ''
    hasNeededMeta = false
    messageMeta: TelegramBot.Message = null
    isReplyToBot = false

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

    public async handleNewMessage(message: TelegramBot.Message) {
        this.messageMeta = message && message.entities ? message.entities[0] : null
        this.hasNeededMeta = !!this.messageMeta &&
            (this.messageMeta.type === "bot_command" ||
                this.messageMeta.type === 'mention' && message?.text?.toLowerCase()?.trim().includes(process.env.TELEGRAM_BOT_NAME))
        this.isReplyToBot = message.reply_to_message && message.reply_to_message.from.username && message.reply_to_message.from.username.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME


        const messageText = message?.text?.toLowerCase()?.trim()
        const chatId = message?.chat?.id

        if (messageText && chatId) {
            if (this.hasNeededMeta) {
                const reply: messageData = {
                    chat_id: chatId,
                }

                if (userRequests.save.some((keyWord: string) => messageText.includes(keyWord))) {
                    this.activeHashtag = hashtags.FILMS
                    reply.text = `#${this.activeHashtag}\n${this.getRandomPhrase(botReplies.forceUser)}`
                }
                if (userRequests.shoplist.some((keyWord: string) => messageText.includes(keyWord))) {
                    this.activeHashtag = hashtags.SHOPPING
                    reply.text = `#${this.activeHashtag}\n${this.getRandomPhrase(botReplies.forceUser)}`
                }
                if (userRequests.getList.some((keyWord: string) => messageText.includes(keyWord))) {
                    this.activeHashtag = hashtags.GETLIST

                    const keyboard = {
                        inline_keyboard: (Object.entries(filters) as string[][]).reduce<{
                            text: string, callback_data: string
                        }[][]>((keyboard, column: string[]) => {
                            if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                                keyboard.push([])
                            }

                            if (keyboard.at(-1)!.length < 2) {
                                keyboard.at(-1)!.push({
                                    text: column[1],
                                    callback_data: JSON.stringify({
                                        type: "filterColumn",
                                        data: column[1] !== filters.NONE ? column[0] : ''
                                    })
                                })
                            }

                            return keyboard
                        }, []),
                    }

                    reply.text = botReplies.askFilter[0]
                    reply.reply_markup = JSON.stringify(keyboard)
                }

                reply.parse_mode = "HTML"

                await this.sendMessage(reply)
            } else if (this.isReplyToBot) {
                this.activeHashtag = this.getHashtag(message.reply_to_message.text)
                const reply: messageData = {
                    chat_id: chatId,
                }

                let keyboard = {}

                switch (this.activeHashtag) {
                    case hashtags.FILMS:
                        await this.handleSaveFilm(messageText, chatId)
                        break
                    case hashtags.SHOPPING:
                        this.shoppingList = messageText.split('\n')

                        keyboard = {
                            inline_keyboard: (Object.values(categories) as string[]).reduce<{
                                text: string, callback_data: string
                            }[][]>((keyboard, category: string) => {
                                if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                                    keyboard.push([])
                                }

                                if (keyboard.at(-1)!.length < 2) {
                                    keyboard.at(-1)!.push({
                                        text: category,
                                        callback_data: JSON.stringify({type: "filterValue", data: category})
                                    })
                                }

                                return keyboard
                            }, []),
                        }

                        reply.text = botReplies.askCategory[0]
                        reply.reply_markup = JSON.stringify(keyboard)

                        await this.sendMessage(reply)
                        break
                    case hashtags.GETLIST:
                        break
                }
            }
        }
    }

    public async handleCallbackQuery(payload: any) {
        const {message} = payload

        const chatId = message?.chat?.id

        if (payload.data) {
            const reply: messageData = {
                chat_id: chatId,
                text: '',
                parse_mode: "HTML",
            }

            const parsedPayload = JSON.parse(payload.data)

            switch (this.activeHashtag) {
                case hashtags.FILMS:
                    const film = await findFilmByID(parsedPayload.data)
                    await googleInstance.addRow(parseInt(process.env.FILMS_SHEET_ID!), [film.name, `https://www.kinopoisk.ru/film/${film.id}/`, film.id])

                    reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}`

                    break
                case hashtags.SHOPPING:
                    const rows: string[][] = this.shoppingList.map(item => [item, parsedPayload.data])

                    await googleInstance.addRows(parseInt(process.env.SHOPPING_SHEET_ID!), rows)
                    this.shoppingList = []

                    reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}/edit#gid=${process.env.SHOPPING_SHEET_ID}`

                    break
                case hashtags.GETLIST:
                    if (parsedPayload.type) {
                        switch (parsedPayload.type) {
                            case "filterColumn":
                                this.filterColumn = parsedPayload.data ? filters[parsedPayload.data] : ""

                                if (!this.filterColumn) {
                                    break
                                }

                                reply.text = 'Отлично, что выберем?'
                                reply.reply_markup = {
                                    inline_keyboard: (Object.values(categories) as string[]).reduce<{
                                        text: string, callback_data: string
                                    }[][]>((keyboard, category: string) => {
                                        if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                                            keyboard.push([])
                                        }

                                        if (keyboard.at(-1)!.length < 2) {
                                            keyboard.at(-1)!.push({
                                                text: category, callback_data: JSON.stringify({
                                                    type: 'filterValue',
                                                    data: category
                                                })
                                            })
                                        }

                                        return keyboard
                                    }, []),
                                }
                                await this.sendMessage(reply)
                                return
                            case "filterValue":
                                this.filterValue = parsedPayload.data
                        }
                    }
                    const shopItems = await googleInstance.getRows(process.env.SHOPPING_SHEET_ID, this.filterColumn, this.filterValue)

                    const formattedList = shopItems.map((item: any) => {
                        return `    - ${item[columns.NAME]}`
                    })

                    reply.text = `<b>Надо купить: </b>\n${formattedList.join('\n')}`

                    break
            }

            await this.sendMessage(reply)
        }
    }

    async handleSaveFilm(filmName: string, chatId: string): Promise<void> {
        let films = await findFilmByName(filmName)

        const formattedFilmList = films.map((film: any, index: number) => {
            const {name, rating, year, shortDescription, id} = film
            const kpLink = `https://www.kinopoisk.ru/film/${id}`
            return `<b>${index + 1}. ${name} (${year})</b>\n<i>kp: ${rating.kp}, imdb: ${rating.imdb}</i>\n${shortDescription ? shortDescription : kpLink}`
        }).join('\n\n')

        const replyText = `<b>Нашлось ${films.length} фильмов:</b>\n\n${formattedFilmList}`

        const inlineKeyboardMarkup = {
            inline_keyboard: films.map((film: any, index: number) => {
                return [{text: index + 1, callback_data: JSON.stringify({data: film.id})}]
            })
        }

        try {
            const message: messageData = {
                parse_mode: "HTML",
                chat_id: chatId,
                text: replyText,
                reply_markup: JSON.stringify(inlineKeyboardMarkup)
            }

            await this.sendMessage(message)
        } catch (e) {
            console.log(e)
        }

        return
    }
}