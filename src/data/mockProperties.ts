export interface MockProperty {
  id: string;
  address: string;
  city: string;
  propertyType: string;
  yearBuilt: number;
  profileCompletion: number;
  homeScore: number | null;
  documentCount: number;
  status: "active" | "draft" | "archived";
  imageUrl?: string;
}

export const MOCK_PROPERTIES: MockProperty[] = [
  {
    id: "prop-1",
    address: "1245 Rue des Érables",
    city: "Laval",
    propertyType: "Bungalow",
    yearBuilt: 1978,
    profileCompletion: 72,
    homeScore: 64,
    documentCount: 5,
    status: "active",
  },
  {
    id: "prop-2",
    address: "88 Boulevard Saint-Martin O",
    city: "Laval",
    propertyType: "Cottage",
    yearBuilt: 1992,
    profileCompletion: 45,
    homeScore: null,
    documentCount: 2,
    status: "active",
  },
  {
    id: "prop-3",
    address: "310 Rue de Lisbonne, apt 4",
    city: "Montréal",
    propertyType: "Condo",
    yearBuilt: 2015,
    profileCompletion: 90,
    homeScore: 81,
    documentCount: 12,
    status: "active",
  },
];
