import fastify from "fastify";
import { GoogleSpreadsheet } from 'google-spreadsheet'
import axios from 'axios'
import { config } from 'dotenv'
import { JWT } from 'google-auth-library'

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

    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id
    if (!messageText || !chatId) {
        return res.code(400)
    }
})