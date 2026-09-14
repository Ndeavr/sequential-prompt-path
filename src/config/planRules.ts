/**
 * UNPRO — Plan Rules Configuration
 * Feature limits per canonical contractor plan.
 * Prices NEVER live here — see src/config/contractorPlans.ts and public.plans.
 */

export const planRules = {
  recrue: {
    maxProperties: 1,
    maxQuotesPerMonth: 3,
    aiAnalysis: false,
    detailedScores: false,
    prioritySupport: false,
    appointmentsIncluded: 0,
  },
  depart: {
    maxProperties: 3,
    maxQuotesPerMonth: 10,
    aiAnalysis: false,
    detailedScores: true,
    prioritySupport: false,
    appointmentsIncluded: 1,
  },
  croissance_v2: {
    maxProperties: 5,
    maxQuotesPerMonth: 25,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: false,
    appointmentsIncluded: 3,
  },
  pro_v2: {
    maxProperties: 10,
    maxQuotesPerMonth: -1,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: true,
    appointmentsIncluded: 7,
  },
  elite_v2: {
    maxProperties: -1,
    maxQuotesPerMonth: -1,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: true,
    appointmentsIncluded: 12,
  },
};
