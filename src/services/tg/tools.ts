import { TelegramBot } from '@/types/telegram';
import axios from 'axios';

const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`;

export const sendMessage = async (message: TelegramBot.SendMessageParams): Promise<void> => {
    await axios.post(`${telegramUrl}/sendMessage`, message);
};

export const getRandomPhrase = (phraseList: string[]): string => {
    return phraseList[Math.floor(Math.random() * phraseList.length)];
};

export const editMessage = async (messageId: number, params: TelegramBot.SendMessageParams) => {
    try {
        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/editMessageText`, {
            chat_id: params.chat_id,
            message_id: messageId,
            text: params.text,
            parse_mode: params.parse_mode,
            reply_markup: params.reply_markup,
        });
    } catch (error) {
        console.error('Ошибка редактирования сообщения:', error);
    }
};
