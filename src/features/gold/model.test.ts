import { expect, test } from 'vitest';
import { goldNumber, sinceMonth } from './model';
test('six-digit founding numbers, 1 through 1000 only',()=>{expect(goldNumber(1)).toBe('#000001');expect(goldNumber(1000)).toBe('#001000');for(const n of [0,1001,1.5])expect(goldNumber(n)).toBeNull();});
test('Since uses real Toronto membership month, hides unknown dates, FR/EN',()=>{expect(sinceMonth('2026-11-01T02:00:00Z','fr')).toBe('Depuis 10/2026');expect(sinceMonth('2026-11-25T03:01:00Z','en')).toBe('Since 11/2026');expect(sinceMonth(null,'fr')).toBeNull();expect(sinceMonth('bad','en')).toBeNull();});
