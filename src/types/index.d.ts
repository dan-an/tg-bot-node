import { TelegramBot } from '@/types/telegram';

export class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'HttpError';
    }
}

export interface PhraseConfig {
    [key: string]: string[];
}

export interface ProcessedEvent {
    summary: string,
    date: string
}

export interface EventsMap {
    [key: string]: Array<ProcessedEvent>;
}

export type DialogInstance = {
    handleNewMessage: (message: TelegramBot.Message) => Promise<void>;
    handleCallbackQuery?: (payload: TelegramBot.CallbackQuery) => Promise<void>;
    on: (event: string, callback: () => void) => void;
};

export type DialogConstructor = new () => DialogInstance;