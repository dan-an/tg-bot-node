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

config()

const TELEGRAM_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`

let activeHashtag = ''
let shoppingList: string[] = []
let filterColumn = ''
let filterValue = ''

const sendMessage = async (message: messageData): Promise<void> => {
    await axios.post(`${TELEGRAM_URL}/sendMessage`, message)
}

const handleSaveFilm = async (filmName: string, chatId: string): Promise<void> => {
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

        await sendMessage(message)
    } catch (e) {
        console.log(e)
    }

    return
}

const getRandomPhrase = (phraseList: string[]): string => {
    return phraseList[Math.floor(Math.random() * phraseList.length)]
}

const getHashtag = (messageText: string): string => {
    const regex = /#(.+)/;
    const match = messageText.match(regex);

    return match![1]
}

export const handleNewMessage = async (message: any) => {
    console.log('message', message)
    const messageMeta = message && message.entities ? message.entities[0] : null
    const hasNeededMeta = !!messageMeta &&
        (messageMeta.type === "bot_command" ||
            messageMeta.type === 'mention' && message?.text?.toLowerCase()?.trim().includes(process.env.TELEGRAM_BOT_NAME))
    const isReplyToBot = message.reply_to_message && message.reply_to_message.from.username && message.reply_to_message.from.username.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME


    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id

    if (messageText && chatId) {
        if (hasNeededMeta) {
            const reply: messageData = {
                chat_id: chatId,
            }

            if (userRequests.save.some((keyWord: string) => messageText.includes(keyWord))) {
                activeHashtag = hashtags.FILMS
                reply.text = `#${activeHashtag}\n${getRandomPhrase(botReplies.forceUser)}`
            }
            if (userRequests.shoplist.some((keyWord: string) => messageText.includes(keyWord))) {
                activeHashtag = hashtags.SHOPPING
                reply.text = `#${activeHashtag}\n${getRandomPhrase(botReplies.forceUser)}`
            }
            if (userRequests.getList.some((keyWord: string) => messageText.includes(keyWord))) {
                activeHashtag = hashtags.GETLIST

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

            await sendMessage(reply)
        } else if (isReplyToBot) {
            activeHashtag = getHashtag(message.reply_to_message.text)
            const reply: messageData = {
                chat_id: chatId,
            }

            let keyboard = {}

            switch (activeHashtag) {
                case hashtags.FILMS:
                    await handleSaveFilm(messageText, chatId)
                    break
                case hashtags.SHOPPING:
                    shoppingList = messageText.split('\n')

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

                    await sendMessage(reply)
                    break
                case hashtags.GETLIST:
                    break
            }
        }
    }
}

export const handleCallbackQuery = async (payload: any) => {
    const {message} = payload

    const chatId = message?.chat?.id

    if (payload.data) {
        const reply: messageData = {
            chat_id: chatId,
            text: '',
            parse_mode: "HTML",
        }

        const parsedPayload = JSON.parse(payload.data)

        switch (activeHashtag) {
            case hashtags.FILMS:
                const film = await findFilmByID(parsedPayload.data)
                await googleInstance.addRow(parseInt(process.env.FILMS_SHEET_ID!), [film.name, `https://www.kinopoisk.ru/film/${film.id}/`, film.id])

                reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}`

                break
            case hashtags.SHOPPING:
                const rows: string[][] = shoppingList.map(item => [item, parsedPayload.data])

                await googleInstance.addRows(parseInt(process.env.SHOPPING_SHEET_ID!), rows)
                shoppingList = []

                reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}/edit#gid=${process.env.SHOPPING_SHEET_ID}`

                break
            case hashtags.GETLIST:
                if (parsedPayload.type) {
                    switch (parsedPayload.type) {
                        case "filterColumn":
                            filterColumn = parsedPayload.data ? filters[parsedPayload.data] : ""

                            if (!filterColumn) {
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
                            await sendMessage(reply)
                            return
                        case "filterValue":
                            filterValue = parsedPayload.data
                    }
                }
                const shopItems = await googleInstance.getRows(process.env.SHOPPING_SHEET_ID, filterColumn, filterValue)

                const formattedList = shopItems.map((item: any) => {
                    return `    - ${item[columns.NAME]}`
                })

                reply.text = `<b>Надо купить: </b>\n${formattedList.join('\n')}`

                break
        }

        await sendMessage(reply)
    }
}