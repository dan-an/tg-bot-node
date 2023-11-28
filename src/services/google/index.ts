import {GoogleSpreadsheet} from "google-spreadsheet";
import {config} from "dotenv";
import {JWT} from "google-auth-library";

config()

export class GoogleInstance {
    private serviceAccountAuth: JWT = new JWT();
    private doc: GoogleSpreadsheet = null as unknown as GoogleSpreadsheet;
    async init() {
        console.log('init')
        this.serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
            ],
        });

        this.doc = new GoogleSpreadsheet(process.env.GOOGLE_FILM_LIST_ID!, this.serviceAccountAuth)
        await this.doc.loadInfo()
    }

    async addRow(title: string, link: string, id: string) {
        const filmList = this.doc.sheetsById[parseInt(process.env.FILMS_SHEET_ID!)]
        await filmList.addRow({'название': title, "ссылка": link, "id": id})
    }

    static async create() {
        console.log('create')
        const o = new GoogleInstance();
        await o.init();
        return o;
    }
}