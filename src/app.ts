import fastify from 'fastify';
import { config } from 'dotenv';
import NewMessage from '@/routes/newMessage';
import { GoogleInstance } from '@/services/google';
import { TelegramController } from '@/services/tg';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { generateBirthdayMessage } from '@/tools';
import { TelegramBot } from '@/types/telegram';

dayjs.extend(utc);
dayjs.extend(timezone);

config();

const server = fastify();

// Initialize Google and Telegram clients
export const googleInstance = await GoogleInstance.create();
export const telegramControllerInstance = new TelegramController();

// Register routes
server.register(NewMessage);

const executeTask = async () => {
    console.log(`[TASK] Запуск задачи в 8:00 MSK`);
    await googleInstance.fetchBirthdayEvents();
    const text = generateBirthdayMessage(googleInstance.getBirthdayEvents());

    const message: TelegramBot.SendMessageParams = {
        chat_id: process.env.TELEGRAM_MAIN_CHAT_ID!,
        text,
    };

    await telegramControllerInstance.sendMessage(message);
};

const startScheduler = async () => {
    while (true) {
        const now = dayjs().tz('Europe/Moscow');

        if (now.hour() === 12 && now.minute() === 16) {
            try {
                await executeTask();
            } catch (error) {
                console.error(`[TASK] Ошибка выполнения задачи:`, error);
            }

            await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        }

        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
};

startScheduler();

// start
const start = async () => {
    try {
        await server.listen({ port: parseInt(process.env.PORT!), host: '0.0.0.0' });
        console.log(`Server is listening at port ${process.env.PORT}`);
    } catch (err) {
        console.log(err);
    }
};
start();
