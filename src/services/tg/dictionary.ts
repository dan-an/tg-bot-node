// @ts-ignore
import {PhraseConfig} from "../../types/index.ts"

export const userRequests: PhraseConfig = {
    save: ['запомни фильм', 'savefilm'],
    shoplist: ['сохрани в покупки', 'shopping'],
    getList: ['что купить?', 'whattobuy']
}

export enum hashtags {
    FILMS = 'кино',
    SHOPPING = 'покупки',
    GETLIST = 'что_купить'
}

export enum categories {
    FOOD = "продукты",
    CLOTHES = "одежда",
    CHEMISTRY = "бытовая химия",
    CAR = "в машину",
    OTHER = "другое"
}

export enum columns {
    NAME = "Название или ссылка",
    CATEGORY = "Категория",
    // SHOP = "Магазин"
}

export enum filters {
    CATEGORY = "Категория",
    // SHOP = "Магазин",
    NONE = "Не важно",
}

export const botReplies: PhraseConfig = {
    nothingFound: ['Я такого не нашла('],
    askHelp: ['Помоги выбрать', 'Не могу определиться', 'Есть из чего выбрать'],
    forceUser: ["Записываю)", 'Диктуй!'],
    askCategory: ['А какая это категория товаров?'],
    askFilter: ["Хочешь выбрать покупки по какому-то признаку?"]
}