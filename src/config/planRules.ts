/**
 * UNPRO — Plan Rules Configuration
 * Defines subscription plan tiers and feature access.
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
  pro: {
    maxProperties: 3,
    maxQuotesPerMonth: 10,
    aiAnalysis: false,
    detailedScores: true,
    prioritySupport: false,
    appointmentsIncluded: 5,
  },
  premium: {
    maxProperties: 5,
    maxQuotesPerMonth: 25,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: false,
    appointmentsIncluded: 10,
  },
  elite: {
    maxProperties: 10,
    maxQuotesPerMonth: -1,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: true,
    appointmentsIncluded: 25,
  },
  signature: {
    maxProperties: -1,
    maxQuotesPerMonth: -1,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: true,
    appointmentsIncluded: 50,
  },
};
