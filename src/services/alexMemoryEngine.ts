/**
 * AlexMemoryEngine — In-session memory store for Alex conversations.
 * 
 * RULES:
 * - Never forget the need within the same session
 * - Never re-ask a validated data point
 * - If user corrects something, overwrite previous memory
 * - If need changes clearly, create a new flow branch
 */

export interface AlexSessionMemory {
  // Role & intent
  resolved_role: "homeowner" | "entrepreneur" | "condo_manager" | "rep" | "admin" | "unknown";
  role_confidence: number;
  role_source: "auth" | "intent" | "cta_origin" | "history" | "default";
  
  // Current intent
  current_intent: string | null;
  intent_confidence: number;
  
  // Need
  need_summary: string | null;
  need_qualified: boolean;
  problem_type: string | null;
  service_category: string | null;
  urgency: "low" | "medium" | "high" | "emergency" | null;
  
  // Location
  address_known: boolean;
  city: string | null;
  postal_code: string | null;
  
  // Property
  property_id: string | null;
  property_type: string | null;
  
  // Contractor match
  recommended_contractor_id: string | null;
  recommended_contractor_name: string | null;
  match_score: number | null;
  
  // Booking
  proposed_slot: string | null;
  booking_confirmed: boolean;
  booking_id: string | null;
  
  // Entrepreneur plan flow
  recommended_plan: string | null;
  plan_checkout_started: boolean;
  
  // Conversation state
  last_question_asked: string | null;
  last_missing_field: string | null;
  questions_asked_count: number;
  current_route: string | null;
  
  // Photo/file
  has_photo: boolean;
  has_quote: boolean;
  photo_analysis_result: string | null;
}

export function createEmptyMemory(): AlexSessionMemory {
  return {
    resolved_role: "unknown",
    role_confidence: 0,
    role_source: "default",
    current_intent: null,
    intent_confidence: 0,
    need_summary: null,
    need_qualified: false,
    problem_type: null,
    service_category: null,
    urgency: null,
    address_known: false,
    city: null,
    postal_code: null,
    property_id: null,
    property_type: null,
    recommended_contractor_id: null,
    recommended_contractor_name: null,
    match_score: null,
    proposed_slot: null,
    booking_confirmed: false,
    booking_id: null,
    recommended_plan: null,
    plan_checkout_started: false,
    last_question_asked: null,
    last_missing_field: null,
    questions_asked_count: 0,
    current_route: null,
    has_photo: false,
    has_quote: false,
    photo_analysis_result: null,
  };
}

export class AlexMemoryStore {
  private memory: AlexSessionMemory;
  private history: Array<{ key: string; oldValue: any; newValue: any; timestamp: number }> = [];

  constructor(initial?: Partial<AlexSessionMemory>) {
    this.memory = { ...createEmptyMemory(), ...initial };
  }

  get(): AlexSessionMemory {
    return { ...this.memory };
  }

  /**
   * Update memory field. Tracks changes for audit.
   * RULE: overwrite if user corrects something.
   */
  set<K extends keyof AlexSessionMemory>(key: K, value: AlexSessionMemory[K]): void {
    const oldValue = this.memory[key];
    if (oldValue === value) return;
    
    this.history.push({
      key: key as string,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
    });
    this.memory[key] = value;
  }

  /** Batch update multiple fields */
  update(partial: Partial<AlexSessionMemory>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.set(key as keyof AlexSessionMemory, value as any);
    }
  }

  /** Check if a field already has a valid value (not null/empty/false) */
  has(key: keyof AlexSessionMemory): boolean {
    const v = this.memory[key];
    return v !== null && v !== undefined && v !== false && v !== "" && v !== 0;
  }

  /** Check if asking for this field would be redundant */
  isRedundantAsk(field: string): boolean {
    switch (field) {
      case "city":
      case "address":
        return this.memory.address_known || !!this.memory.city;
      case "problem":
      case "need":
        return this.memory.need_qualified;
      case "service":
        return !!this.memory.service_category;
      case "name":
        return this.memory.resolved_role !== "unknown";
      default:
        return false;
    }
  }

  /** Get change history */
  getHistory() {
    return [...this.history];
  }

  /** Export for persistence */
  toJSON(): AlexSessionMemory {
    return { ...this.memory };
  }
}
