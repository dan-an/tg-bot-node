import { describe, it, expect } from 'vitest';
import { getRandomPhrase } from '@/tools';

describe('getRandomPhrase', () => {
    const phraseList = ['привет', 'здравствуй', 'добрый день'];

    it('returns random value from array', () => {
        const values = new Set(phraseList);
        const result = getRandomPhrase(phraseList);
        expect(values.has(result)).toBe(true);
    });

    it('value is a string', () => {
        const result = getRandomPhrase(phraseList);
        expect(typeof result === 'string');
    });

    it('result is randomized', () => {
        let result = new Set();
        for (let i = 0; i < 10; i++) {
            result.add(getRandomPhrase(phraseList));
        }

        expect(result.size).toBeGreaterThan(1);
    });
});
