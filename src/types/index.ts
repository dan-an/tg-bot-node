export class HttpError extends Error {
    statusCode
    constructor (message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

interface PhraseConfig {
    [key: string]: string[]
}

export const userRequests: PhraseConfig = {
    save: ['запомни фильм', 'save']
}