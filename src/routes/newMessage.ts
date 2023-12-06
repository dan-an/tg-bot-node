import {FastifyInstance, FastifyPluginAsync} from "fastify";
import fp from 'fastify-plugin';
// @ts-ignore
import { handleNewMessage, handleCallbackQuery } from "../services/tg/index.ts";
// @ts-ignore
import {HttpError, TelegramBot} from "../types/index.ts";
// @ts-ignore
import {telegramControllerInstance} from "../app.ts";

const NewMessage: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.post('/new-message', async (request, reply) => {
        // @ts-ignore
        const {message, callback_query} = request.body

        try {
            if (!!message) {
                await telegramControllerInstance.handleNewMessage(message)
            } else if (!!callback_query) {
                await telegramControllerInstance.handleCallbackQuery(callback_query)
            }
        } catch (e) {
            console.log(e)
            reply.code((e as HttpError).statusCode)
        }
    })
}

export default fp(NewMessage)