import { botReplies, categories, columns, filters } from '@/services/tg/dictionary';
import { googleInstance } from '@/app';
import { TelegramBot } from '@/types/telegram';
import { editMessage, sendMessage } from '@/services/tg/tools';
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
            message.reply_to_message?.from?.username?.toLowerCase()?.trim() ===
            process.env.TELEGRAM_BOT_NAME?.toLowerCase();

        const reply: TelegramBot.SendMessageParams = {
            chat_id: this.chatId,
            parse_mode: 'HTML',
            text: '',
        };

        if (!this.isReplyToBot) {
            const keyboard: TelegramBot.InlineKeyboardMarkup = {
                inline_keyboard: (Object.entries(filters) as string[][]).reduce<
                    {
                        text: string;
                        callback_data: string;
                    }[][]
                >((keyboard, column: string[]) => {
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
            const parsedPayload = JSON.parse(payload.data);

            if (parsedPayload.type === 'delete') {
                const rowNumber = parseInt(parsedPayload.data, 10);
                await googleInstance.deleteRow(+(process.env.SHOPPING_SHEET_ID ?? ''), rowNumber);
                await this.sendShoppingList(message.message_id);
                return;
            }

            if (parsedPayload.type === 'done') {
                await sendMessage({
                    chat_id: this.chatId,
                    text: '👌 Список обновлён. Если понадобится ещё что-то — дай знать.',
                    parse_mode: 'HTML',
                });

                this.emit('dialog is over');
                return;
            }

            if (parsedPayload.type === 'filterColumn') {
                this.filterColumn = parsedPayload.data ? filters[parsedPayload.data as keyof typeof filters] : '';

                if (!this.filterColumn) {
                    // Если фильтра нет ("не важно"), сразу отправляем весь список покупок
                    await this.sendShoppingList();
                    return;
                }

                const reply: TelegramBot.SendMessageParams = {
                    chat_id: this.chatId,
                    text: 'Отлично, что выберем?',
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: (Object.values(categories) as string[]).reduce<
                            {
                                text: string;
                                callback_data: string;
                            }[][]
                        >((keyboard, category: string) => {
                            if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                                keyboard.push([]);
                            }

                            if (keyboard.at(-1)!.length < 2) {
                                keyboard.at(-1)!.push({
                                    text: category,
                                    callback_data: JSON.stringify({
                                        type: 'filterValue',
                                        data: category,
                                    }),
                                });
                            }

                            return keyboard;
                        }, []),
                    },
                };
                await sendMessage(reply);
                return;
            }

            if (parsedPayload.type === 'filterValue') {
                this.filterValue = parsedPayload.data;
                await this.sendShoppingList();
            }
        }
    }

    private async sendShoppingList(editMessageId?: number) {
        const shopItems = await googleInstance.getRows(
            +(process.env.SHOPPING_SHEET_ID ?? ''),
            this.filterColumn,
            this.filterValue,
        );

        const formattedList: { text: string; callback_data: string }[] = shopItems.map((item: any, index: number) => ({
            text: `- ${item[columns.NAME]}`,
            callback_data: JSON.stringify({ type: 'delete', data: index + 2 }),
        }));

        const reply: TelegramBot.SendMessageParams = {
            chat_id: this.chatId,
            text: '<b>Надо купить:</b>\n' + formattedList.map((i, idx) => `${idx + 1}. ${i.text}`).join('\n'),
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    ...formattedList.map((item, idx) => [
                        {
                            text: `❌ Удалить ${idx + 1}`,
                            callback_data: item.callback_data,
                        },
                    ]),
                    [
                        {
                            text: '✅ Готово',
                            callback_data: JSON.stringify({ type: 'done' }),
                        },
                    ],
                ],
            },
        };

        if (editMessageId) {
            await editMessage(editMessageId, reply);
        } else {
            await sendMessage(reply);
        }
    }
}
