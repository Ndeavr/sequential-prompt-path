/**
 * usePropertyMap — Hook for public property map data with viewport-based loading.
 * Queries public-safe views, supports filtering and clustering.
 */
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MapMarker {
  id: string;
  slug: string | null;
  city: string | null;
  neighborhood: string | null;
  property_type: string | null;
  year_built: number | null;
  photo_url: string | null;
  public_status: string | null;
  certification_status: string | null;
  estimated_score: number | null;
  latitude: number;
  longitude: number;
}

export interface RenovationActivity {
  id: string;
  work_type: string;
  contribution_status: string;
  work_date: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  neighborhood: string | null;
  contractor_name: string | null;
  contractor_slug: string | null;
}

export interface NeighborhoodStat {
  id: string;
  area_key: string;
  area_type: string;
  city: string | null;
  neighborhood: string | null;
  avg_score: number | null;
  property_count: number | null;
  active_passports: number | null;
  recent_improvements: number | null;
  top_renovation_types: any;
}

export interface MapFilters {
  scoreMin: number;
  scoreMax: number;
  certified: boolean;
  activePassport: boolean;
  estimated: boolean;
  workInProgress: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const DEFAULT_FILTERS: MapFilters = {
  scoreMin: 0,
  scoreMax: 100,
  certified: false,
  activePassport: false,
  estimated: false,
  workInProgress: false,
};

export const usePropertyMap = () => {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [showRenovations, setShowRenovations] = useState(false);
  const [renovationFilter, setRenovationFilter] = useState<string | null>(null);

  // Property markers query
  const markersQuery = useQuery({
    queryKey: ["property-map-markers", bounds, filters],
    queryFn: async () => {
      let query = supabase
        .from("v_property_map_markers" as any)
        .select("*");

      // Viewport filter
      if (bounds) {
        query = query
          .gte("latitude", bounds.south)
          .lte("latitude", bounds.north)
          .gte("longitude", bounds.west)
          .lte("longitude", bounds.east);
      }

      // Score range filter
      if (filters.scoreMin > 0) {
        query = query.gte("estimated_score", filters.scoreMin);
      }
      if (filters.scoreMax < 100) {
        query = query.lte("estimated_score", filters.scoreMax);
      }

      // Status filters
      if (filters.certified) {
        query = query.eq("certification_status", "certified");
      }
      if (filters.activePassport) {
        query = query.eq("public_status", "active");
      }
      if (filters.estimated) {
        query = query.eq("public_status", "estimated");
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as unknown as MapMarker[];
    },
    enabled: true,
    staleTime: 30000, // Cache 30s
  });

  // Renovation activity query
  const renovationQuery = useQuery({
    queryKey: ["renovation-activity-map", bounds, renovationFilter],
    queryFn: async () => {
      let query = supabase
        .from("v_renovation_activity_map" as any)
        .select("*");

      if (bounds) {
        query = query
          .gte("latitude", bounds.south)
          .lte("latitude", bounds.north)
          .gte("longitude", bounds.west)
          .lte("longitude", bounds.east);
      }

      if (renovationFilter) {
        query = query.eq("work_type", renovationFilter);
      }

      const { data, error } = await query.limit(300);
      if (error) throw error;
      return (data || []) as unknown as RenovationActivity[];
    },
    enabled: showRenovations,
    staleTime: 60000,
  });

  // Neighborhood stats query
  const neighborhoodQuery = useQuery({
    queryKey: ["neighborhood-stats-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhood_stats")
        .select("*")
        .order("property_count", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as NeighborhoodStat[];
    },
    staleTime: 300000, // Cache 5min
  });

  const updateBounds = useCallback((newBounds: MapBounds) => {
    setBounds(newBounds);
  }, []);

  return {
    markers: markersQuery.data || [],
    renovations: renovationQuery.data || [],
    neighborhoods: neighborhoodQuery.data || [],
    isLoading: markersQuery.isLoading,
    isLoadingRenovations: renovationQuery.isLoading,
    filters,
    setFilters,
    showRenovations,
    setShowRenovations,
    renovationFilter,
    setRenovationFilter,
    updateBounds,
  };
};
