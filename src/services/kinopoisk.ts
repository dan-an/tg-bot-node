import axios from "axios";
import {config} from "dotenv";
import * as process from "process";

config()

const options = {
    headers: {
        'X-API-KEY': process.env.KINOPOISK_API_KEY
    }
}

export async function findFilmByName(title: string): Promise<any> {
    const response = await axios.get(`https://api.kinopoisk.dev/v1.3/movie?page=1&limit=10&name=${title}`, options)

    return response.data.docs
}

export async function findFilmByID (id: string): Promise<any> {
    const response = await axios.get(`https://api.kinopoisk.dev/v1.3/movie/${id}`, options)

    return response.data
}