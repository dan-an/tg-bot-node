import fastify from "fastify";
import { GoogleSpreadsheet } from 'google-spreadsheet'
import axios from 'axios'
import { config } from 'dotenv'
import { JWT } from 'google-auth-library'
import * as process from "process";

const TELEGRAM_URI = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/sendMessage`

config()

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

server.post('/new-message', async (req, res) => {
    // @ts-ignore
    const { message } = req.body

    console.log('req.body', req.body)

    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id
    if (!messageText || !chatId) {
        return res.code(400)
    }

    try {
        await axios.post(TELEGRAM_URI, {
            chat_id: chatId,
            text: `ты написал ${messageText}`
        })
        res.send('Done')
    } catch (e) {
        console.log(e)
        res.send(e)
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
