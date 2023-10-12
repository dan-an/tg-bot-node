import {FastifyInstance, FastifyPluginAsync} from "fastify";
import fp from 'fastify-plugin';
// @ts-ignore
import handleNewMessage from "../services/tg/index.ts";
// @ts-ignore
import {HttpError} from "../types/index.ts";
import logIncome from "@/services/tg/logger";

const NewMessage: FastifyPluginAsync = async (server: FastifyInstance)=> {
    server.post('/new-message', async (request, reply) => {
        // @ts-ignore
        const { message } = request.body

        try {
            logIncome(request.body)
            await handleNewMessage(message)
        } catch(e) {
            console.log(e)
            reply.code((e as HttpError).statusCode)
        }
    })
}

export default fp(NewMessage)