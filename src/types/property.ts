/**
 * UNPRO — Property Types
 */

export interface Property {
  id: string;
  ownerId: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: "house" | "condo" | "townhouse" | "duplex" | "commercial";
  yearBuilt?: number;
  squareFootage?: number;
  homeScore?: number;
  aippScore?: number;
  createdAt: string;
  updatedAt: string;
}
