import { describe, it, expect } from 'vitest';
import { getRandomPhrase } from '@/tools';

describe('getRandomPhrase', () => {
    const phraseList = ['привет', 'здравствуй', 'добрый день'];

    it('возвращает строку из списка', () => {
        const values = new Set(phraseList);
        const result = getRandomPhrase(phraseList);
        expect(values.has(result)).toBe(true);
    });
});
