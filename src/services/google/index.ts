import {GoogleSpreadsheet} from "google-spreadsheet";
import {config} from "dotenv";
import {JWT} from "google-auth-library";
import {googleInstance} from "@/app";

config()

export class GoogleInstance {
    private serviceAccountAuth: JWT = new JWT();
    private doc: GoogleSpreadsheet = null as unknown as GoogleSpreadsheet;
    async init() {
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

    public async addRow(worksheetId: number, values: string[]) {
        const worksheet = this.doc.sheetsById[worksheetId]
        await worksheet.addRow(values)
    }

    static async create() {
        const o = new GoogleInstance();
        await o.init();
        return o;
    }
}