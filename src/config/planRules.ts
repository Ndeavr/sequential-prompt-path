/**
 * UNPRO — Plan Rules Configuration
 * Defines subscription plan tiers and feature access.
 */

export const planRules = {
  free: {
    maxProperties: 1,
    maxQuotesPerMonth: 3,
    aiAnalysis: false,
    detailedScores: false,
    prioritySupport: false,
  },
  pro: {
    maxProperties: 5,
    maxQuotesPerMonth: 25,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: false,
  },
  premium: {
    maxProperties: -1, // unlimited
    maxQuotesPerMonth: -1,
    aiAnalysis: true,
    detailedScores: true,
    prioritySupport: true,
  },
};
