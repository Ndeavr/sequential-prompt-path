/**
 * UNPRO — Service Category Types
 */

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}
