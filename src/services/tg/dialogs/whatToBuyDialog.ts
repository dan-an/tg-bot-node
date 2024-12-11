import { botReplies, categories, columns, filters } from '@/services/tg/dictionary';
import { googleInstance } from '@/app';
import { TelegramBot } from '@/types/telegram';
import { sendMessage } from '@/services/tg/tools';
import { EventEmitter } from 'events';
import { config } from 'dotenv';


config();

export class WhatToBuyDialog extends EventEmitter {
    chatId = '';
    isReplyToBot = false;
    filterColumn = '';
    filterValue = '';

    public async handleNewMessage(message: TelegramBot.Message) {
        this.chatId = message?.chat?.id.toString();
        this.isReplyToBot =
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() === process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const reply: TelegramBot.SendMessageParams = {
            chat_id: this.chatId,
            parse_mode: 'HTML',
            text: '',
        };

        if (!this.isReplyToBot) {
            const keyboard: TelegramBot.InlineKeyboardMarkup = {
                inline_keyboard: (Object.entries(filters) as string[][]).reduce<{
                    text: string, callback_data: string
                }[][]>((keyboard, column: string[]) => {
                    if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                        keyboard.push([]);
                    }

                    if (keyboard.at(-1)!.length < 2) {
                        keyboard.at(-1)!.push({
                            text: column[1],
                            callback_data: JSON.stringify({
                                type: 'filterColumn',
                                data: column[1] !== filters.NONE ? column[0] : '',
                            }),
                        });
                    }

                    return keyboard;
                }, []),
            };

            reply.text = botReplies.askFilter[0];
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

            if (parsedPayload.type) {
                switch (parsedPayload.type) {
                    case 'filterColumn':
                        this.filterColumn = parsedPayload.data ? filters[(parsedPayload.data as keyof typeof filters)] : '';

                        if (!this.filterColumn) {
                            break;
                        }

                        reply.text = 'Отлично, что выберем?';
                        reply.reply_markup = {
                            inline_keyboard: (Object.values(categories) as string[]).reduce<{
                                text: string, callback_data: string
                            }[][]>((keyboard, category: string) => {
                                if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                                    keyboard.push([]);
                                }

                                if (keyboard.at(-1)!.length < 2) {
                                    keyboard.at(-1)!.push({
                                        text: category, callback_data: JSON.stringify({
                                            type: 'filterValue',
                                            data: category,
                                        }),
                                    });
                                }

                                return keyboard;
                            }, []),
                        };
                        await sendMessage(reply);
                        return;
                    case 'filterValue':
                        this.filterValue = parsedPayload.data;
                }
            }
            const shopItems = await googleInstance.getRows(+(process.env.SHOPPING_SHEET_ID ?? ''), this.filterColumn, this.filterValue);

            const formattedList = shopItems.map((item: any) => {
                return `    - ${item[columns.NAME]}`;
            });

            reply.text = `<b>Надо купить: </b>\n${formattedList.join('\n')}`;

            await sendMessage(reply);

            this.emit('dialog is over');
        }
    }
}