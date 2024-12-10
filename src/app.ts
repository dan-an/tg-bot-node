import fastify from "fastify";
import { config } from 'dotenv'
import NewMessage from "@/routes/newMessage";
import { GoogleInstance } from "@/services/google";
import { TelegramController } from "@/services/tg";
import Bree from "bree";
import {generateBirthdayMessage} from "@/tools";
import {TelegramBot} from "@/types/telegram";
import * as process from "process";

config()

const server = fastify()

// Initialize Google and Telegram clients
export const googleInstance = await GoogleInstance.create()
export const telegramControllerInstance = new TelegramController()

// Register routes
server.register(NewMessage)

const bree = new Bree({
    jobs: [
        {
            name: 'fetch-birthday-events',
            interval: 'at 8:00 am',
        },
    ],
});

bree.add({
    name: 'fetch-birthday-events',
    path: async () => {
        console.log(`[TASK] Запуск задачи в 8:00 MSK`);
        await googleInstance.fetchBirthdayEvents();
        const text = generateBirthdayMessage(googleInstance.getBirthdayEvents())

        const message: TelegramBot.SendMessageParams = {
            chat_id: process.env.TELEGRAM_MAIN_CHAT_ID!,
            text
        }

        await telegramControllerInstance.sendMessage(message);
    },
});

// Запускаем Bree
bree.start();

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
