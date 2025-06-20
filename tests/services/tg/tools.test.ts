import { describe, it, expect } from 'vitest';
import { getRandomString } from '@/tools';
import { resolveMessageMeta } from '@/services/tg/tools';
import { regularMessage, emptyMessage, commandMessage, replyMessage } from '../../mocks/tg/message';

describe('getRandomPhrase', () => {
    const phraseList = ['привет', 'здравствуй', 'добрый день'];

    it('returns random value from array', () => {
        const values = new Set(phraseList);
        const result = getRandomString(phraseList);
        expect(values.has(result)).toBe(true);
    });

    it('value is a string', () => {
        const result = getRandomString(phraseList);
        expect(typeof result === 'string');
    });

    it('result is randomized', () => {
        let result = new Set();
        for (let i = 0; i < 10; i++) {
            result.add(getRandomString(phraseList));
        }

        expect(result.size).toBeGreaterThan(1);
    });
});

describe('resolveMessageMeta', () => {
    it('empty message, to be ignored', () => {
        const result = resolveMessageMeta(emptyMessage, 'BotName');

        expect(result).toEqual({ meta: null, isAddressedToBot: false });
    });

    it('regular message, to be ignored', () => {
        const result = resolveMessageMeta(regularMessage, 'BotName');

        expect(result).toEqual({ meta: null, isAddressedToBot: false });
    });

    it('command message, should be handled', () => {
        const result = resolveMessageMeta(commandMessage, 'BotName');

        expect(result).toEqual({
            meta: {
                offset: 0,
                length: 9,
                type: 'bot_command',
            },
            isAddressedToBot: true,
        });
    });

    it('reply message, should be handled', () => {
        const result = resolveMessageMeta(replyMessage, 'BotName');

        expect(result).toEqual({
            meta: null,
            isAddressedToBot: false,
        });
    });
});
