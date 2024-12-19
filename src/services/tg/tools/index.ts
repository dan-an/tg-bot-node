import { TelegramBot } from '@/types/telegram';
import axios from 'axios';

const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`;

export const sendMessage = async (message: TelegramBot.SendMessageParams): Promise<void> => {
    await axios.post(`${telegramUrl}/sendMessage`, message);
};

export const getRandomPhrase = (phraseList: string[]): string => {
    return phraseList[Math.floor(Math.random() * phraseList.length)];
};