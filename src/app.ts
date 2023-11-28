import fastify from "fastify";
import { config } from 'dotenv'
// @ts-ignore
import {findFilmByName} from "./services/kinopoisk.ts";
// @ts-ignore
import NewMessage from "./routes/newMessage.ts";
// @ts-ignore
import { GoogleInstance } from "./services/google/index.ts";

config()

const server = fastify()

console.log('started after public add row')

//Initialize google client
await GoogleInstance.create()

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
