import {GoogleSpreadsheet} from "google-spreadsheet";
import {config} from "dotenv";
import {JWT} from "google-auth-library";
import {calendar, calendar_v3} from "@googleapis/calendar";
import * as process from "process";
import {EventsMap} from "@/types";
import dayjs from "dayjs";

config()

export class GoogleInstance {
    private serviceAccountAuth: JWT = new JWT();
    private doc: GoogleSpreadsheet = null as unknown as GoogleSpreadsheet;
    private calendarClient: calendar_v3.Calendar = null as unknown as calendar_v3.Calendar
    private birthdayEvents: EventsMap = {
        today: [],
        tomorrow: [],
        inThreeDays: [],
        inOneWeek: [],
        inTwoWeeks: [],
        inThreeWeeks: [],
    };
    async init() {
        this.serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/calendar',
            ],
        });

        this.doc = new GoogleSpreadsheet(process.env.GOOGLE_FILM_LIST_ID!, this.serviceAccountAuth)
        this.calendarClient = calendar({version: 'v3', auth: this.serviceAccountAuth, })

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

        return filteredRows
    }

    public async fetchBirthdayEvents() {
        const now = dayjs().startOf('day');
        const threeWeeksFromNow = dayjs().add(3, 'week');

        const res = await this.calendarClient.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            q: 'день рождения',
            timeMin: now.toISOString(),
            timeMax: threeWeeksFromNow.toISOString(),
        })
        const extractName = (summary: string): string => {
            const match = summary.match(/День рождения\.\s*(.+)/i);
            return match ? match[1] : 'Неизвестное имя';
        }

        const events = res.data.items || [];
        const tomorrow = now.add(1, 'day');
        const inThreeDays = now.add(3, 'day');
        const inOneWeek = now.add(1, 'week');
        const inTwoWeeks = now.add(2, 'week');
        const inThreeWeeks = now.add(3, 'week');

        events.reduce((acc: EventsMap, event: calendar_v3.Schema$Event) => {
            const eventDate = dayjs(event.start?.dateTime || event.start?.date);
            const formattedDate = eventDate.format('DD.MM.YYYY');
            const name = extractName(event.summary || '');
            const transformedEvent = { summary: name, date: formattedDate };

            if (eventDate.isSame(now, 'day')) {
                acc.today.push(transformedEvent);
            } else if (eventDate.isSame(tomorrow, 'day')) {
                acc.tomorrow.push(transformedEvent);
            } else if (eventDate.isBefore(inThreeDays, 'day')) {
                acc.inThreeDays.push(transformedEvent);
            } else if (eventDate.isBefore(inOneWeek, 'day')) {
                acc.inOneWeek.push(transformedEvent);
            } else if (eventDate.isBefore(inTwoWeeks, 'day')) {
                acc.inTwoWeeks.push(transformedEvent);
            } else if (eventDate.isBefore(inThreeWeeks, 'day')) {
                acc.inThreeWeeks.push(transformedEvent);
            }

            return acc;
        }, this.birthdayEvents);
    }

    public getBirthdayEvents(period?: string): EventsMap {
        if (period) {
            if (!this.birthdayEvents[period]) {
                console.warn(`Период "${period}" отсутствует в событиях.`);
                return {};
            }

            return { [period]: this.birthdayEvents[period] };
        }

        return this.birthdayEvents;
    }

    static async create() {
        const o = new GoogleInstance();
        await o.init();
        return o;
    }
}