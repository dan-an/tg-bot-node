// @ts-ignore
import {findFilm} from "./services/kinopoisk.ts";
import axios from "axios";
import {config} from "dotenv";
// @ts-ignore
import {HttpError} from "../types/index.ts";

config()

const TELEGRAM_URI = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/sendMessage`
const handleNewMessage = async (message: any) => {
    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id
    if (!messageText || !chatId) {
        throw new HttpError('No message text or chat id', 400)
    }

    let films = await findFilm(messageText)

    const formattedFilmList = films.map((film: any, index: number) => {
        const {name, rating, year, shortDescription} = film
        return `<b>${index + 1}. ${name} (${year})</b>\n<i>kp: ${rating.kp}, imdb: ${rating.imdb}</i>\n${shortDescription}`
    }).join('\n\n')

    const replyText = `<b>Нашлось ${films.length} фильмов:</b>\n\n${formattedFilmList}`

    const inlineKeyboardMarkup = {
        inline_keyboard: films.map((film: any, index: number) => {
            return [{text: index + 1, callback_data: film.id}]
        })
    }

    try {
        await axios.post(TELEGRAM_URI, {
            parse_mode: "HTML",
            chat_id: chatId,
            text: replyText,
            reply_markup: JSON.stringify(inlineKeyboardMarkup)
        })
    } catch (e) {
        console.log(e)
    }
}
export default handleNewMessage