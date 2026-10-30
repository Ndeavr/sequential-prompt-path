import { describe, expect, it } from 'vitest';
import { rankHeatPumpDemo, defaultHeatPumpPreferences, heatPumpDraft } from '@/lib/heatPumpDemo';
describe('heat pump illustrative preferences', () => {
  it('prioritizes central installations and excludes repair', () => {
    expect(rankHeatPumpDemo(defaultHeatPumpPreferences)).toEqual(['central', 'wall']);
  });
  it('moves an accepted project behind a new priority without dropping it', () => {
    expect(rankHeatPumpDemo({ central: 'accepted', wall: 'priority', repair: 'excluded' })).toEqual(['wall', 'central']);
  });
  it('never reintroduces an excluded project when everything is excluded', () => {
    expect(rankHeatPumpDemo({ central: 'excluded', wall: 'excluded', repair: 'excluded' })).toEqual([]);
  });
  it('prepares a confirmation draft without inventing territory or saving success', () => {
    expect(heatPumpDraft(defaultHeatPumpPreferences, 'fr')).toContain('réparation — non recherché');
    expect(heatPumpDraft(defaultHeatPumpPreferences, 'en')).toContain('complete central installation — priority');
    expect(heatPumpDraft(defaultHeatPumpPreferences, 'fr')).not.toContain('Laval');
  });
});
