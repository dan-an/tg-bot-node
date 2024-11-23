import {GoogleSpreadsheet} from "google-spreadsheet";
import {config} from "dotenv";
import {JWT} from "google-auth-library";

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

    public async addRows(worksheetId: number, values: string[][]) {
        const worksheet = this.doc.sheetsById[worksheetId]
        await worksheet.addRows(values)
    }

    public async getRows(worksheetId: number, column: string = "Категория", filterValue: string = 'продукты') {
        const worksheet = this.doc.sheetsById[worksheetId]
        const rows = await worksheet.getRows()
        const formattedRows = rows.map(row => row.toObject())
        let filteredRows = JSON.parse(JSON.stringify(formattedRows))
        if (column && filterValue) {
            filteredRows = formattedRows.filter(row => row[column] === filterValue)
        }

        // console.log('filteredRows', filteredRows)

        return filteredRows
    }

    static async create() {
        const o = new GoogleInstance();
        await o.init();
        return o;
    }
}