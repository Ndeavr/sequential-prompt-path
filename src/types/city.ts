/**
 * UNPRO — City Types
 */

export interface City {
  id: string;
  name: string;
  slug: string;
  province: string;
  provinceSlug: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  isActive: boolean;
  createdAt: string;
}
