/**
 * UNPRO — Score Types
 */

export interface HomeScoreResult {
  overall: number;
  breakdown: {
    structure: number;
    systems: number;
    exterior: number;
    interior: number;
    maintenance: number;
  };
  trend: ScoreDataPoint[];
  recommendations: string[];
}

export interface AIPPScoreResult {
  overall: number;
  components: {
    propertyCondition: number;
    contractorQuality: number;
    quoteFairness: number;
    maintenanceHistory: number;
  };
  trend: ScoreDataPoint[];
}

export interface ScoreDataPoint {
  date: string;
  value: number;
}
