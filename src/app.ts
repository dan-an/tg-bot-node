import fastify from "fastify";
import { config } from 'dotenv'
import NewMessage from "@/routes/newMessage";
import { GoogleInstance } from "@/services/google";
import { TelegramController } from "@/services/tg";

config()

const server = fastify()

//Initialize google client
export const googleInstance = await GoogleInstance.create()

export const telegramControllerInstance = new TelegramController()

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
