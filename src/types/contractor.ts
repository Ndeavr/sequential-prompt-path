/**
 * UNPRO — Contractor Types
 */

export interface Contractor {
  id: string;
  userId: string;
  businessName: string;
  specialty: string[];
  serviceArea: string[];
  licenseNumber?: string;
  insuranceVerified: boolean;
  aippScore?: number;
  rating?: number;
  reviewCount: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorProfile extends Contractor {
  bio?: string;
  portfolioImages: string[];
  yearsExperience?: number;
  phone?: string;
  email?: string;
  website?: string;
}
