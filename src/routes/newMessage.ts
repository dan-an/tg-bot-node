import { FastifyPluginAsync } from 'fastify';
import { HttpError } from '@/types';
import { telegramControllerInstance } from '@/app';
import { TelegramBot } from '@/types/telegram';

const NewMessage: FastifyPluginAsync = async (server) => {
    server.post('/new-message', async (request, reply) => {
        const { message, callback_query } = request.body as TelegramBot.Update;

        try {
            if (!!message) {
                await telegramControllerInstance.handleNewMessage(message);
            } else if (!!callback_query) {
                await telegramControllerInstance.handleCallbackQuery(callback_query);
            }
        } catch (e) {
            console.log(e);
            reply.code((e as HttpError).statusCode);
        }
    });
};

export default NewMessage;
