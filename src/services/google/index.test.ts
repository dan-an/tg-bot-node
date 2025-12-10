import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GoogleInstance } from './index';
import { calendar_v3 } from '@googleapis/calendar';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('GoogleInstance.fetchBirthdayEvents', () => {
    const RealDate = Date;
    const fixedNow = dayjs.tz('2024-12-20T00:00:00', 'Europe/Moscow').toDate();

    beforeEach(() => {
        // @ts-expect-error overriding Date for deterministic time handling
        globalThis.Date = class MockDate extends RealDate {
            constructor(...args: ConstructorParameters<typeof RealDate>) {
                if (args.length === 0) {
                    return new RealDate(fixedNow);
                }

                return new RealDate(...args);
            }

            static now() {
                return fixedNow.getTime();
            }
        } as unknown as typeof Date;
    });

    afterEach(() => {
        globalThis.Date = RealDate;
    });

    const buildInstanceWithEvents = (items: calendar_v3.Schema$Event[]) => {
        const instance = new GoogleInstance();
        (instance as any).calendarClient = {
            events: {
                list: () => Promise.resolve({ data: { items } }),
            },
        } as unknown as calendar_v3.Calendar;

        return instance;
    };

    it('distributes birthdays into buckets based on Moscow day difference', async () => {
        const events: calendar_v3.Schema$Event[] = [
            { summary: 'День рождения. Сегодня', start: { date: '2024-12-20' } },
            { summary: 'День рождения. Завтра', start: { date: '2024-12-21' } },
            { summary: 'День рождения. В три дня', start: { date: '2024-12-22' } },
            { summary: 'День рождения. Также три дня', start: { date: '2024-12-23' } },
            { summary: 'День рождения. Через неделю', start: { date: '2024-12-25' } },
            { summary: 'День рождения. Через две недели', start: { date: '2024-12-30' } },
            { summary: 'День рождения. Через три недели', start: { date: '2025-01-04' } },
        ];

        const instance = buildInstanceWithEvents(events);
        await instance.fetchBirthdayEvents();
        const result = instance.getBirthdayEvents();

        expect(result.today).toEqual([{ summary: 'Сегодня', date: '20.12.2024' }]);
        expect(result.tomorrow).toEqual([{ summary: 'Завтра', date: '21.12.2024' }]);
        expect(result.inThreeDays).toEqual([
            { summary: 'В три дня', date: '22.12.2024' },
            { summary: 'Также три дня', date: '23.12.2024' },
        ]);
        expect(result.inOneWeek).toEqual([{ summary: 'Через неделю', date: '25.12.2024' }]);
        expect(result.inTwoWeeks).toEqual([{ summary: 'Через две недели', date: '30.12.2024' }]);
        expect(result.inThreeWeeks).toEqual([{ summary: 'Через три недели', date: '04.01.2025' }]);
    });

    it('ignores events without a start date', async () => {
        const events: calendar_v3.Schema$Event[] = [
            { summary: 'День рождения. Сегодня', start: { date: '2024-12-20' } },
            { summary: 'День рождения. Нет даты' },
        ];

        const instance = buildInstanceWithEvents(events);
        await instance.fetchBirthdayEvents();
        const result = instance.getBirthdayEvents();

        expect(result.today).toEqual([{ summary: 'Сегодня', date: '20.12.2024' }]);
        expect(result.tomorrow).toEqual([]);
        expect(result.inThreeDays).toEqual([]);
        expect(result.inOneWeek).toEqual([]);
        expect(result.inTwoWeeks).toEqual([]);
        expect(result.inThreeWeeks).toEqual([]);
    });
});
