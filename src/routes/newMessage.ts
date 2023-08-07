import {FastifyInstance, FastifyPluginAsync} from "fastify";
import fp from 'fastify-plugin';
import handleNewMessage from "@/services/tg";

const NewMessage: FastifyPluginAsync = async (server: FastifyInstance)=> {
    server.post('/new-message', async (request, reply) => {
        // @ts-ignore
        const { message } = request.body

        try {
            await handleNewMessage(message)
        } catch(e) {
            console.log(e)
            reply.code((e as HttpError).statusCode)
        }
    })
}

export default fp(NewMessage)