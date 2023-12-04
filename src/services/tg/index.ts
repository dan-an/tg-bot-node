// @ts-ignore
import {findFilmByName, findFilmByID} from "../kinopoisk.ts";
import axios from "axios";
import {config} from "dotenv";
// @ts-ignore
import {HttpError, messageData} from "../../types/index.ts";
import * as process from "process";
// @ts-ignore
import {botReplies, userRequests, hashtags} from "./dictionary.ts";
// @ts-ignore
import {googleInstance} from "../../app.ts";

config()

const TELEGRAM_URI = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/sendMessage`

const sendMessage = async (message: messageData): Promise<void> => {
    await axios.post(TELEGRAM_URI, message)
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
            return [{text: index + 1, callback_data: film.id}]
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
    const messageMeta = message && message.entities ? message.entities[0] : null
    const hasNeededMeta = !!messageMeta &&
        (messageMeta.type === "bot_command" ||
            messageMeta.type === 'mention' && message?.text?.toLowerCase()?.trim().includes(process.env.TELEGRAM_BOT_NAME))
    const isReplyToBot = message.reply_to_message && message.reply_to_message.from.username.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME


    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id

    if (messageText && chatId) {
        if (hasNeededMeta) {
            if (userRequests.save.some((keyWord: string) => messageText.includes(keyWord))) {
                const reply: messageData = {
                    chat_id: chatId,
                    text: `#${hashtags.FILMS}\n${getRandomPhrase(botReplies.forceUser)}`,
                    parse_mode: "HTML",
                }

                await sendMessage(reply)
            }
            if (userRequests.shoplist.some((keyWord: string) => messageText.includes(keyWord))) {
                const reply: messageData = {
                    chat_id: chatId,
                    text: `#${hashtags.SHOPPING}\n${getRandomPhrase(botReplies.forceUser)}`,
                    parse_mode: "HTML",
                }

                await sendMessage(reply)
            }
        } else if (isReplyToBot) {
            const hashtag = getHashtag(message.reply_to_message.text)

            switch (hashtag) {
                case hashtags.FILMS:
                    await handleSaveFilm(messageText, chatId)
                    break
                case hashtags.SHOPPING:
                    await googleInstance.addRow(parseInt(process.env.SHOPPING_SHEET_ID!), [messageText])

                    const reply: messageData = {
                        chat_id: chatId,
                        text: `Записала сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}/edit#gid=${process.env.SHOPPING_SHEET_ID}`,
                    }

                    await sendMessage(reply)
                    break
            }
        }
    }
}

export const handleCallbackQuery = async (payload: any) => {
    const {message} = payload

    const chatId = message?.chat?.id

    if (payload.data) {
        const film = await findFilmByID(payload.data)
        await googleInstance.addRow(parseInt(process.env.FILMS_SHEET_ID!), [film.name, `https://www.kinopoisk.ru/film/${film.id}/`, film.id])

        const reply: messageData = {
            chat_id: chatId,
            text: `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}`,
        }

        await sendMessage(reply)
    }
}