/**
 * Mock data for the Alex Conversation Ad Preview
 */

export interface ConversationStep {
  id: string;
  type: "user-image" | "user-text" | "alex-text" | "alex-diagnosis" | "alex-recommendation" | "alex-why" | "alex-calendar" | "alex-slot-ask" | "booking-confirmed" | "typing";
  content?: string;
  delay: number; // ms before this step appears
  duration?: number; // ms this step takes to fully render
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
  { id: "upload", type: "user-image", delay: 400, duration: 600 },
  { id: "typing-1", type: "typing", delay: 800, duration: 1200 },
  { id: "diagnosis", type: "alex-diagnosis", content: "Ah je vois. Barrage de glace + perte de chaleur. Probable manque d'isolation dans l'entretoit.", delay: 0, duration: 800 },
  { id: "recommendation", type: "alex-recommendation", content: "Je vous propose Isolation Solution Royal.", delay: 600, duration: 600 },
  { id: "why", type: "alex-why", delay: 400, duration: 800 },
  { id: "calendar", type: "alex-calendar", delay: 600, duration: 800 },
  { id: "slot-ask", type: "alex-slot-ask", content: "Mardi à 11h, ça vous va ?", delay: 500, duration: 600 },
  { id: "typing-2", type: "typing", delay: 800, duration: 800 },
  { id: "user-reply", type: "user-text", content: "Oui, parfait.", delay: 0, duration: 400 },
  { id: "confirmed", type: "booking-confirmed", delay: 600, duration: 1000 },
];
