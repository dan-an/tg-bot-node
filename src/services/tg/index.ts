// @ts-ignore
import {findFilmByName, findFilmByID} from "../kinopoisk.ts";
import axios from "axios";
import {config} from "dotenv";
// @ts-ignore
import {HttpError, messageData} from "../../types/index.ts";
import * as process from "process";
// @ts-ignore
import {userRequests} from "./dictionary.ts";
// @ts-ignore
import {googleInstance} from "../../app.ts";

config()

const TELEGRAM_URI = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/sendMessage`

const sendMessage = async (message: messageData): Promise<void> => {
    await axios.post(TELEGRAM_URI, message)
}

const handleSaveFilm = async (filmName: string, chatId: string): Promise<any> => {
    let films = await findFilmByName(filmName)

    const formattedFilmList = films.map((film: any, index: number) => {
        const {name, rating, year, description} = film
        return `<b>${index + 1}. ${name} (${year})</b>\n<i>kp: ${rating.kp}, imdb: ${rating.imdb}</i>\n${description}`
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
export const handleNewMessage = async (message: any) => {
    console.log('handleNewMessage', message)

    const messageMeta = message && message.entities ? message.entities[0] : null
    const hasNeededMeta = !!messageMeta &&
        (messageMeta.type === "bot_command" ||
            messageMeta.type === 'mention' && message?.text?.toLowerCase()?.trim().includes(process.env.TELEGRAM_BOT_NAME))
    const isReplyToBot = message.reply_to_message && message.reply_to_message.from.username.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME


    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id

    if (!messageText || !chatId) {
        throw new HttpError('No message text or chat id', 400)
    }

    if (hasNeededMeta) {
        if (userRequests.save.some((keyWord: string) => messageText.includes(keyWord))) {
            const message: messageData = {
                chat_id: chatId,
                text: 'Диктуй',
            }

            await sendMessage(message)
        }
    } else if (isReplyToBot) {
        await handleSaveFilm(messageText, chatId)
    }
}

export const handleCallbackQuery = async (payload: any) => {
    const {message} = payload

    const chatId = message?.chat?.id

    if (payload.data) {
        const film = await findFilmByID(payload.data)
        await googleInstance.addRow(film.name, `https://www.kinopoisk.ru/film/${film.id}/`, film.id)

        const reply: messageData = {
            chat_id: chatId,
            text: `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}`,
        }

        await sendMessage(reply)
    }
}