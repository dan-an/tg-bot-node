import { botReplies, event_types, hashtags } from '@/services/tg/dictionary';
import { TelegramBot } from '@/types/telegram';
import { sendMessage } from '@/services/tg/tools';
import { EventEmitter } from 'events';
import { config } from 'dotenv';
import { googleInstance } from '@/app';

config();

export class AddEventDialog extends EventEmitter {
    chatId = '';
    isReplyToBot = false;
    eventType: keyof typeof event_types = 'NONE';

    public async handleNewMessage(message: TelegramBot.Message) {
        const messageText = message.text?.trim() ?? '';
        this.chatId = message.chat?.id.toString();
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
                inline_keyboard: (Object.entries(event_types) as string[][]).reduce<
                    {
                        text: string;
                        callback_data: string;
                    }[][]
                >((keyboard, eventType: string[]) => {
                    if (!keyboard.length || keyboard.at(-1)!.length === 2) {
                        keyboard.push([]);
                    }

                    if (keyboard.at(-1)!.length < 2) {
                        keyboard.at(-1)!.push({
                            text: eventType[1],
                            callback_data: JSON.stringify({
                                type: 'eventType',
                                data: eventType[1] !== event_types.NONE ? eventType[0] : '',
                            }),
                        });
                    }

                    return keyboard;
                }, []),
            };

            reply.text = botReplies.askEventType[0];
            reply.reply_markup = keyboard;
        } else {
            await this.handleAddEvent(messageText);

            reply.text = `Сохранил в Семейный календарь, напомню ближе к делу`;
        }

        await sendMessage(reply);
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

            if (parsedPayload.data) {
                this.eventType = parsedPayload.data;

                switch (parsedPayload.data) {
                    case 'BIRTHDAY': {
                        reply.text = `#${hashtags.ADD_EVENT}\n${botReplies.askBirthdayContent[0]}`;
                    }
                }
            }

            await sendMessage(reply);
        }
    }

    private async handleAddEvent(eventContext: string) {
        const entries = this.parseInputLines(eventContext);
        for (const line of entries) {
            const lineWithType = `${event_types[this.eventType]}. ${line}`;
            await googleInstance.addEvent(lineWithType);
        }
        this.emit('dialog is over');
    }

    private parseInputLines(input: string): string[] {
        return input
            .split(/[\n,;]+/)
            .map((line) => line.trim())
            .filter(Boolean);
    }
}
