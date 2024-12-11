import { botReplies, categories, hashtags } from '@/services/tg/dictionary';
import { googleInstance } from '@/app';
import { TelegramBot } from '@/types/telegram';
import { getRandomPhrase, sendMessage } from '@/services/tg/tools';
import { EventEmitter } from 'events';
import { config } from 'dotenv';


config();

export class ShoppingDialog extends EventEmitter {
    chatId = '';
    isReplyToBot = false;
    shoppingList: string[] = [];

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
            reply.text = `#${hashtags.SHOPPING}\n${getRandomPhrase(botReplies.forceUser)}`;
            await sendMessage(reply);
        } else {
            this.shoppingList = messageText.split('\n');
            const keyboard: TelegramBot.InlineKeyboardMarkup = {
                inline_keyboard: (Object.values(categories) as string[]).reduce<{
                    text: string, callback_data: string
                }[][]>((keyboard, category: string) => {
                    if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                        keyboard.push([]);
                    }

                    if (keyboard.at(-1)!.length < 2) {
                        keyboard.at(-1)!.push({
                            text: category,
                            callback_data: JSON.stringify({ type: 'filterValue', data: category }),
                        });
                    }

                    return keyboard;
                }, []),
            };

            reply.text = botReplies.askCategory[0];
            reply.reply_markup = keyboard;

            await sendMessage(reply);
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

            const rows: string[][] = this.shoppingList.map(item => [item, parsedPayload.data]);

            await googleInstance.addRows(parseInt(process.env.SHOPPING_SHEET_ID!), rows);
            this.shoppingList = [];

            reply.text = `Сохранила сюда - https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_FILM_LIST_ID}/edit#gid=${process.env.SHOPPING_SHEET_ID}`;

            await sendMessage(reply);
            this.emit('dialog is over');
        }
    }
}