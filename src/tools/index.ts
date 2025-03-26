import { EventsMap, ProcessedEvent } from '@/types';

export const chooseRandomElement = (arr: any[]) => {
    return arr[Math.floor(Math.random() * arr.length)];
};

export const generateBirthdayMessage = (data: EventsMap): string => {
    const sections: { [key: string]: ProcessedEvent[] } = {
        Сегодня: data.today,
        Завтра: data.tomorrow,
        'В ближайшие три дня': data.inThreeDays,
        'В ближайшую неделю': data.inOneWeek,
        'В ближайшие две недели': data.inTwoWeeks,
        'В ближайшие три недели': data.inThreeWeeks,
    };

    let message = '🎉 Напоминаю о ближайших днях рождения:\n\n';

    for (const [title, events] of Object.entries(sections)) {
        if (events.length === 0) {
            message = '';
        } else {
            message += `${title}:\n`;
            events.forEach((event) => {
                message += `- ${event.date} ${event.summary}\n`;
            });
            message += '\n'; // Добавляем пустую строку между секциями
        }
    }

    return message.trim();
};
