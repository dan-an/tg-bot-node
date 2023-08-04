import axios from "axios";
import {config} from "dotenv";
import * as process from "process";

config()

export async function findFilm(title: string): Promise<any> {
    const config = {
        headers: {
            'X-API-KEY': process.env.KINOPOISK_API_KEY
        }
    }

    const response = await axios.get(`https://api.kinopoisk.dev/v1.3/movie?page=1&limit=10&name=${title}`, config)

    return response.data
}