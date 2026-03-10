/**
 * UNPRO — Quote Types
 */

export type QuoteStatus = "pending" | "analyzed" | "accepted" | "rejected";

export interface Quote {
  id: string;
  propertyId: string;
  contractorId?: string;
  title: string;
  amount: number;
  status: QuoteStatus;
  documentUrl?: string;
  createdAt: string;
}

export interface QuoteAnalysis {
  id: string;
  quoteId: string;
  fairnessScore: number;
  marketComparison: number;
  lineItems: QuoteLineItem[];
  recommendations: string[];
  analyzedAt: string;
}

export interface QuoteLineItem {
  description: string;
  amount: number;
  marketAverage: number;
  variance: number;
}
