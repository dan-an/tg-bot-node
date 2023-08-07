import fastify from "fastify";
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { config } from 'dotenv'
import { JWT } from 'google-auth-library'
// @ts-ignore
import {findFilm} from "./services/kinopoisk.ts";
// @ts-ignore
import NewMessage from "./routes/newMessage.ts";

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

// Register routes
server.register(NewMessage)

// start
const start = async () => {
    try {
        await server.listen({ port: parseInt(process.env.PORT!), host: '0.0.0.0' });
        console.log(`Server is listening at port ${process.env.PORT}`)
    } catch (err) {
        console.log(err)
    }
};
start();
