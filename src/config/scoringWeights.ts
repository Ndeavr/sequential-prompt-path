/**
 * UNPRO — Scoring Weights Configuration
 * Defines the weights used in AIPP and Home Score calculations.
 */

export const scoringWeights = {
  homeScore: {
    structure: 0.3,
    systems: 0.25,
    exterior: 0.2,
    interior: 0.15,
    maintenance: 0.1,
  },
  aippScore: {
    propertyCondition: 0.35,
    contractorQuality: 0.25,
    quoteFairness: 0.2,
    maintenanceHistory: 0.2,
  },
  contractorScore: {
    quoteAccuracy: 0.3,
    reviewSentiment: 0.25,
    responseTime: 0.2,
    completionRate: 0.15,
    verificationStatus: 0.1,
  },
};
