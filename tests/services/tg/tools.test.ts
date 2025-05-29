import { describe, it, expect } from 'vitest';
import { getRandomString } from '@/tools';

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
