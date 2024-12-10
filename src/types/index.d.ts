import {calendar_v3} from "@googleapis/calendar";

export class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = "HttpError";
    }
}

export interface PhraseConfig {
    [key: string]: string[];
}

export interface ProccessedEvent {
    summary: string, date: string
}

export interface EventsMap {
    [key: string]: Array<ProccessedEvent>;
}
