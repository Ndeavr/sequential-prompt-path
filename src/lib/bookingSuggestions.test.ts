import { describe, expect, it } from 'vitest';
import { selectSuggestions } from './bookingSuggestions';
const slot=(id:string,start:string,minutes=60)=>({id,starts_at:start,ends_at:new Date(Date.parse(start)+minutes*60000).toISOString()});
describe('published appointment suggestions',()=>{
 const now=new Date('2026-11-07T23:00:00Z');
 it('keeps next week in Quebec, excludes past and wrong duration, offers at most three different days',()=>{
   const rows=[slot('past','2026-11-06T14:00:00Z'),slot('sunday','2026-11-08T14:00:00Z'),slot('a','2026-11-09T14:00:00Z'),slot('b','2026-11-09T15:00:00Z'),slot('c','2026-11-10T14:00:00Z'),slot('d','2026-11-11T14:00:00Z'),slot('wrong','2026-11-12T14:00:00Z',75)];
   expect(selectSuggestions(rows,'next_week','morning',60,now).map(s=>s.id)).toEqual(['a','c','d']);
 });
 it('never invents a fallback and respects the afternoon preference',()=>{
   expect(selectSuggestions([],'this_week','flexible',60,now)).toEqual([]);
   expect(selectSuggestions([slot('morning','2026-11-09T14:00:00Z'),slot('afternoon','2026-11-09T19:00:00Z')],'next_week','afternoon',60,now).map(s=>s.id)).toEqual(['afternoon']);
 });
});
