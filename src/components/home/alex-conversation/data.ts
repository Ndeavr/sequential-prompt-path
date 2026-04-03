/**
 * Mock data for the Alex Conversation Ad Preview
 */

export interface ConversationStep {
  id: string;
  type: "user-image" | "user-text" | "alex-text" | "alex-diagnosis" | "alex-recommendation" | "alex-why" | "alex-calendar" | "alex-slot-ask" | "booking-confirmed" | "typing";
  content?: string;
  delay: number; // ms before this step appears
  duration?: number; // ms this step takes to fully render
  voice?: boolean; // whether Alex speaks this step
}

export const SCENARIO = {
  slug: "ice-dam-booking-preview",
  problemType: "barrage_glace",
  confidence: 92,
  contractor: {
    name: "Isolation Solution Royal",
    score: 92,
    location: "Laval / Montréal",
    services: ["Isolation d'entretoit", "Vermiculite", "Barrage de glace"],
  },
  whyChoice: {
    title: "Pourquoi ce choix",
    shortText: "C'est en plein dans leurs cordes.",
    points: [
      "Spécialiste isolation d'entretoit",
      "Habitué aux barrages de glace",
      "Disponible dans votre secteur",
      "Intervention possible cette semaine",
    ],
  },
  appointment: {
    day: "Mardi",
    time: "11h",
    city: "Laval",
  },
} as const;

export const BOOKING_SLOTS = [
  { id: "1", dayLabel: "Lun", dateLabel: "14 avr", timeLabel: "15h30", isRecommended: false },
  { id: "2", dayLabel: "Mar", dateLabel: "15 avr", timeLabel: "11h00", isRecommended: true },
  { id: "3", dayLabel: "Mer", dateLabel: "16 avr", timeLabel: "9h30", isRecommended: false },
  { id: "4", dayLabel: "Jeu", dateLabel: "17 avr", timeLabel: "14h00", isRecommended: false },
] as const;

export const CONVERSATION_TIMELINE: ConversationStep[] = [
  // 1. Alex greeting
  { id: "greeting", type: "alex-text", content: "Bonjour! Comment puis-je vous aider aujourd'hui?", delay: 600, duration: 1200, voice: true },
  // 2. User describes problem
  { id: "user-problem", type: "user-text", content: "J'ai un problème de glace sur le toit.", delay: 1800, duration: 800 },
  // 3. Alex typing...
  { id: "typing-0", type: "typing", delay: 1200, duration: 1800 },
  // 4. Alex asks for photo
  { id: "alex-ask-photo", type: "alex-text", content: "Pourriez-vous téléverser une photo pour que je l'analyse?", delay: 0, duration: 1200, voice: true },
  // 5. User uploads photo
  { id: "upload", type: "user-image", delay: 2000, duration: 1000 },
  // 6. Alex typing (analyzing)
  { id: "typing-1", type: "typing", delay: 1400, duration: 2200 },
  // 7. Diagnosis
  { id: "diagnosis", type: "alex-diagnosis", content: "Ah je vois. Barrage de glace + perte de chaleur. Probable manque d'isolation dans l'entretoit.", delay: 0, duration: 1400, voice: true },
  // 8. Recommendation
  { id: "recommendation", type: "alex-recommendation", content: "Je vous propose Isolation Solution Royal.", delay: 1200, duration: 1000, voice: true },
  // 9. Why this choice
  { id: "why", type: "alex-why", delay: 1000, duration: 1200 },
  // 10. Calendar
  { id: "calendar", type: "alex-calendar", delay: 1200, duration: 1200 },
  // 11. Alex slot ask
  { id: "slot-ask", type: "alex-slot-ask", content: "Mardi à 11h, ça vous va?", delay: 1000, duration: 1000, voice: true },
  // 12. Typing user
  { id: "typing-2", type: "typing", delay: 1600, duration: 1200 },
  // 13. User reply
  { id: "user-reply", type: "user-text", content: "Oui, parfait.", delay: 0, duration: 800 },
  // 14. Confirmed
  { id: "confirmed", type: "booking-confirmed", delay: 1200, duration: 1400 },
];
