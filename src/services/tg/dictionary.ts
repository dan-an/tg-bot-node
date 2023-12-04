// @ts-ignore
import {PhraseConfig} from "../../types/index.ts"

export const userRequests: PhraseConfig = {
    save: ['запомни фильм', 'save'],
    shoplist: ['сохрани в покупки', 'shopping']
}

export enum hashtags {
    FILMS = 'кино',
    SHOPPING = 'покупки',
}

export enum categories {
    FOOD = "продукты",
    CLOTHES = "одежда",
    CHEMISTRY = "бытовая химия",
    CAR = "в машину",
    OTHER = "другое"
}

export const botReplies: PhraseConfig = {
    nothingFound: ['Я такого не нашла('],
    askHelp: ['Помоги выбрать', 'Не могу определиться', 'Есть из чего выбрать'],
    forceUser: ["Записываю)", 'Диктуй!'],
    askCategory: ['А какая это категория товаров?']
}