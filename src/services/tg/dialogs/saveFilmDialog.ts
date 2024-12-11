import { botReplies, hashtags } from '@/services/tg/dictionary';
import { googleInstance } from '@/app';
import { TelegramBot } from '@/types/telegram';
import { getRandomPhrase, sendMessage } from '@/services/tg/tools';
import { findFilmByID, findFilmByName } from '@/services/kinopoisk';
import { EventEmitter } from 'events';
import { config } from 'dotenv';

config();

export class SaveFilmDialog extends EventEmitter {
    chatId = '';
    isReplyToBot = false;

    public async handleNewMessage(message: TelegramBot.Message) {
        const messageText = message?.text?.toLowerCase()?.trim() ?? '';
        this.chatId = message?.chat?.id.toString();
        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const reply: TelegramBot.SendMessageParams = {
            chat_id: this.chatId,
            parse_mode: 'HTML',
            text: '',
        };

        if (!this.isReplyToBot) {
            reply.text = `#${hashtags.FILMS}\n${getRandomPhrase(botReplies.forceUser)}`;
            await sendMessage(reply);
        } else {
            await this.handleSaveFilm(messageText, this.chatId);
        }
    }

    public async handleCallbackQuery(payload: any) {
        const { message } = payload;

        this.chatId = message?.chat?.id;

        if (payload.data) {
            const reply: TelegramBot.SendMessageParams = {
                chat_id: this.chatId,
                text: '',
                parse_mode: 'HTML',
            };

            const parsedPayload = JSON.parse(payload.data);

            const film = await findFilmByID(parsedPayload.data);
            await googleInstance.addRow(parseInt(process.env.FILMS_SHEET_ID!), [film.name, `https://www.kinopoisk.ru/film/${film.id}/`, film.id]);

            reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}`;

            await sendMessage(reply);
            this.emit('dialog is over');
        }
    }

    private async handleSaveFilm(filmName: string, chatId: string): Promise<void> {
        let films = await findFilmByName(filmName);

        const formattedFilmList = films.map((film: any, index: number) => {
            const { name, rating, year, shortDescription, id } = film;
            const kpLink = `https://www.kinopoisk.ru/film/${id}`;
            return `<b>${index + 1}. ${name} (${year})</b>\n<i>kp: ${rating.kp}, imdb: ${rating.imdb}</i>\n${shortDescription ? shortDescription : kpLink}`;
        }).join('\n\n');

        const replyText = `<b>Нашлось ${films.length} фильмов:</b>\n\n${formattedFilmList}`;

        const keyboard: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: films.map((film: any, index: number) => {
                return [{ text: index + 1, callback_data: JSON.stringify({ data: film.id }) }];
            }),
        };

        try {
            const message: TelegramBot.SendMessageParams = {
                parse_mode: 'HTML',
                chat_id: chatId,
                text: replyText,
                reply_markup: keyboard,
            };

            await sendMessage(message);
        } catch (e) {
            console.log(e);
        }

        return;
    }
}