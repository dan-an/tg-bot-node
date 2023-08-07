export class HttpError extends Error {
    statusCode
    constructor (message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

export interface PhraseConfig {
    [key: string]: string[]
}

export interface messageData {
    text: string;
    char_id: string;
    parse_mode?: string;
    reply_markup?: string;
}