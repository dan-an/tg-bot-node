import fastify from "fastify";
import { GoogleSpreadsheet } from 'google-spreadsheet'
import axios from 'axios'
import { config } from 'dotenv'
import { JWT } from 'google-auth-library'
import * as process from "process";
// @ts-ignore
import {findFilm} from "./services/kinopoisk.ts";

config()

const TELEGRAM_URI = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/sendMessage`

const server = fastify()

console.log('started')

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_FILM_LIST_ID!, serviceAccountAuth)

const messageText = 'человек паук'

server.post('/new-message', async (req, res) => {
    // @ts-ignore
    const { message } = req.body

    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id
    if (!messageText || !chatId) {
        return res.code(400)
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
            chat_id: 277244759,
            text: replyText,
            reply_markup: JSON.stringify(inlineKeyboardMarkup)
        })
    } catch (e) {
        console.log(e)
    }
})

const start = async () => {
    try {
        await server.listen({ port: parseInt(process.env.PORT!), host: '0.0.0.0' });
        console.log(`Server is listening at port ${process.env.PORT}`)
    } catch (err) {
        console.log(err)
    }
};
start();
