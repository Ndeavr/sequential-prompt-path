/**
 * Memory Extraction Engine
 * Extracts structured facts from user interactions (chat, voice, forms, uploads)
 */

export type MemoryFactType =
  | 'identity' | 'preference' | 'permission' | 'address'
  | 'property' | 'project' | 'symptom' | 'budget'
  | 'timeline' | 'upload' | 'appointment' | 'contractor_match'
  | 'exclusion' | 'correction';

export type MemoryEntityType =
  | 'user' | 'property' | 'address' | 'project'
  | 'problem' | 'upload' | 'quote_analysis'
  | 'appointment_intent' | 'contractor_preference'
  | 'suggested_professional';

export interface ExtractedFact {
  factType: MemoryFactType;
  factKey: string;
  factValue: Record<string, unknown>;
  confidence: number;
  isPersistent: boolean;
  entityType?: MemoryEntityType;
  entityLabel?: string;
  sourceType: string;
}

// Facts to auto-persist (high reuse value)
const AUTO_PERSIST_KEYS = new Set([
  'first_name', 'language', 'preferred_mode', 'address_main',
  'property_type', 'project_type', 'urgency', 'budget_range',
  'permission_mic', 'permission_location', 'role_type',
]);

// Facts that need confirmation before persisting
const CONFIRM_BEFORE_PERSIST_KEYS = new Set([
  'phone', 'address_secondary', 'property_name', 'building_type_uncertain',
  'contractor_preference_specific',
]);

export function classifyPersistence(factKey: string, confidence: number): {
  isPersistent: boolean;
  needsConfirmation: boolean;
} {
  if (AUTO_PERSIST_KEYS.has(factKey) && confidence >= 0.6) {
    return { isPersistent: true, needsConfirmation: false };
  }
  if (CONFIRM_BEFORE_PERSIST_KEYS.has(factKey)) {
    return { isPersistent: false, needsConfirmation: true };
  }
  if (confidence >= 0.8) {
    return { isPersistent: true, needsConfirmation: false };
  }
  return { isPersistent: false, needsConfirmation: false };
}

export function extractFactsFromChat(message: string, role: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  // Address detection
  const addressMatch = message.match(/(\d+[\s,]+(?:rue|avenue|boulevard|chemin|place|rang)\s+[^,.]+(?:,\s*[^,.]+)?)/i);
  if (addressMatch) {
    facts.push({
      factType: 'address',
      factKey: 'address_main',
      factValue: { raw: addressMatch[1].trim() },
      confidence: 0.75,
      isPersistent: true,
      entityType: 'address',
      entityLabel: addressMatch[1].trim(),
      sourceType: 'chat',
    });
  }

  // City detection
  const cityMatch = message.match(/(?:à|de|dans|ville\s*:\s*)(Montréal|Laval|Québec|Longueuil|Gatineau|Sherbrooke|Lévis|Trois-Rivières|Terrebonne|Saint-Jean|Repentigny|Brossard|Drummondville|Saint-Jérôme|Granby)/i);
  if (cityMatch) {
    facts.push({
      factType: 'address',
      factKey: 'city',
      factValue: { city: cityMatch[1] },
      confidence: 0.8,
      isPersistent: true,
      entityType: 'address',
      entityLabel: cityMatch[1],
      sourceType: 'chat',
    });
  }

  // Budget detection
  const budgetMatch = message.match(/(\d[\d\s]*(?:\$|dollars?|CAD)|\$\s*\d[\d\s]*)/i);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(/[\s$CADdollars]/gi, ''), 10);
    if (amount > 0) {
      facts.push({
        factType: 'budget',
        factKey: 'budget_mentioned',
        factValue: { amount, raw: budgetMatch[1] },
        confidence: 0.7,
        isPersistent: false,
        entityType: 'project',
        sourceType: 'chat',
      });
    }
  }

  // Urgency detection
  const urgencyPatterns = [
    { pattern: /urgent|urgence|vite|rapidement|immédiat|tout de suite|au plus vite/i, level: 'high' },
    { pattern: /bientôt|prochaines?\s+semaines?|cette\s+semaine/i, level: 'medium' },
    { pattern: /pas\s+press[ée]|quand\s+(?:vous|tu)\s+(?:pourr|pouv)|éventuellement/i, level: 'low' },
  ];
  for (const { pattern, level } of urgencyPatterns) {
    if (pattern.test(message)) {
      facts.push({
        factType: 'project',
        factKey: 'urgency',
        factValue: { level },
        confidence: 0.7,
        isPersistent: true,
        entityType: 'project',
        sourceType: 'chat',
      });
      break;
    }
  }

  // Problem/symptom detection
  const symptomPatterns = [
    { pattern: /fuit|fuite|eau|dégât\s*d'eau|inondation/i, symptom: 'water_leak' },
    { pattern: /froid|gelé|chauffage|calorifère/i, symptom: 'cold_heating' },
    { pattern: /chaud|climatisation|air\s*conditionn/i, symptom: 'hot_cooling' },
    { pattern: /humid|moisissure|condensation/i, symptom: 'humidity_mold' },
    { pattern: /toiture|toit|bardeau|couverture/i, symptom: 'roofing' },
    { pattern: /plomberie|tuyau|drain|robinet/i, symptom: 'plumbing' },
    { pattern: /électri|panneau|disjoncteur|prise/i, symptom: 'electrical' },
    { pattern: /fenêtre|porte|vitre|cadre/i, symptom: 'windows_doors' },
    { pattern: /isol|laine|cellulose|mousse/i, symptom: 'insulation' },
  ];
  for (const { pattern, symptom } of symptomPatterns) {
    if (pattern.test(message)) {
      facts.push({
        factType: 'symptom',
        factKey: 'problem_detected',
        factValue: { symptom, raw: message.substring(0, 200) },
        confidence: 0.65,
        isPersistent: true,
        entityType: 'problem',
        entityLabel: symptom,
        sourceType: 'chat',
      });
    }
  }

  // Property type detection
  const propertyPatterns = [
    { pattern: /maison|bungalow|cottage|split[-\s]level/i, type: 'house' },
    { pattern: /condo|condominium|copropriété/i, type: 'condo' },
    { pattern: /duplex|triplex|plex|multiplex/i, type: 'plex' },
    { pattern: /immeuble|appartement|logement/i, type: 'building' },
  ];
  for (const { pattern, type } of propertyPatterns) {
    if (pattern.test(message)) {
      facts.push({
        factType: 'property',
        factKey: 'property_type',
        factValue: { type },
        confidence: 0.7,
        isPersistent: true,
        entityType: 'property',
        sourceType: 'chat',
      });
      break;
    }
  }

  // Preference: voice vs chat
  const voicePrefs = [
    { pattern: /je\s+préfère\s+(?:écrire|taper|texte|chat)/i, mode: 'chat' },
    { pattern: /je\s+préfère\s+(?:parler|voix|vocal)/i, mode: 'voice' },
  ];
  for (const { pattern, mode } of voicePrefs) {
    if (pattern.test(message)) {
      facts.push({
        factType: 'preference',
        factKey: 'preferred_mode',
        factValue: { mode },
        confidence: 0.9,
        isPersistent: true,
        sourceType: 'chat',
      });
    }
  }

  return facts;
}

export function extractFactsFromFormData(
  formType: string,
  data: Record<string, unknown>
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  if (formType === 'address' && data.address) {
    facts.push({
      factType: 'address',
      factKey: 'address_main',
      factValue: data as Record<string, unknown>,
      confidence: 0.95,
      isPersistent: true,
      entityType: 'address',
      entityLabel: String(data.address),
      sourceType: 'form',
    });
  }

  if (formType === 'project' && data.projectType) {
    facts.push({
      factType: 'project',
      factKey: 'project_type',
      factValue: data as Record<string, unknown>,
      confidence: 0.9,
      isPersistent: true,
      entityType: 'project',
      entityLabel: String(data.projectType),
      sourceType: 'form',
    });
  }

  if (data.firstName) {
    facts.push({
      factType: 'identity',
      factKey: 'first_name',
      factValue: { firstName: data.firstName },
      confidence: 0.95,
      isPersistent: true,
      sourceType: 'form',
    });
  }

  if (data.phone) {
    facts.push({
      factType: 'identity',
      factKey: 'phone',
      factValue: { phone: data.phone },
      confidence: 0.95,
      isPersistent: false, // needs confirmation
      sourceType: 'form',
    });
  }

  return facts;
}

export function computeFreshnessScore(updatedAt: string): number {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 1) return 1.0;
  if (ageDays < 7) return 0.9;
  if (ageDays < 30) return 0.7;
  if (ageDays < 90) return 0.5;
  if (ageDays < 365) return 0.3;
  return 0.1;
}
