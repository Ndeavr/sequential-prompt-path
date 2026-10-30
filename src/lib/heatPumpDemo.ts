/** Local illustrative ranking only; never used for production eligibility. */
export type HeatPumpPreference = 'priority' | 'accepted' | 'excluded';
export const heatPumpTypes = ['central', 'wall', 'repair'] as const;
export type HeatPumpType = typeof heatPumpTypes[number];
export type HeatPumpPreferences = Record<HeatPumpType, HeatPumpPreference>;
export const defaultHeatPumpPreferences: HeatPumpPreferences = { central: 'priority', wall: 'accepted', repair: 'excluded' };
export function rankHeatPumpDemo(preferences: HeatPumpPreferences): HeatPumpType[] {
  return heatPumpTypes.filter(type => preferences[type] !== 'excluded')
    .sort((a, b) => Number(preferences[b] === 'priority') - Number(preferences[a] === 'priority'));
}
export function heatPumpDraft(preferences: HeatPumpPreferences, lang: 'fr' | 'en'): string {
  const names = lang === 'fr' ? ['installation centrale complète', 'thermopompe murale', 'réparation'] : ['complete central installation', 'wall-mounted heat pump', 'repair'];
  const labels = lang === 'fr' ? { priority: 'prioritaire', accepted: 'accepté', excluded: 'non recherché' } : { priority: 'priority', accepted: 'accepted', excluded: 'not wanted' };
  return (lang === 'fr' ? 'Je suis entrepreneur en thermopompes. Voici mes préférences à confirmer avec vous : ' : 'I am a heat pump contractor. Here are my preferences to confirm with you: ') + heatPumpTypes.map((type, i) => `${names[i]} — ${labels[preferences[type]]}`).join('; ') + '.';
}
