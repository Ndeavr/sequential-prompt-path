import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExtractedFact, computeFreshnessScore, classifyPersistence } from '@/services/memoryExtractionEngine';

const SESSION_MEMORY_KEY = 'unpro_memory_session_id';

function getOrCreateSessionMemoryId(): string {
  let id = sessionStorage.getItem(SESSION_MEMORY_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_MEMORY_KEY, id);
  }
  return id;
}

export function usePersistentUserMemory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const sessionMemoryId = getOrCreateSessionMemoryId();

  // Load user's memory facts
  const { data: facts = [], isLoading: factsLoading } = useQuery({
    queryKey: ['user-memory-facts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_memory_facts' as any)
        .select('*')
        .eq('user_id', userId)
        .neq('status' as any, 'archived')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) { console.error('[Memory] facts fetch error:', error); return []; }
      return (data ?? []) as any[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  // Load memory entities
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ['user-memory-entities', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_memory_entities' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) { console.error('[Memory] entities fetch error:', error); return []; }
      return (data ?? []) as any[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  // Save a fact
  const saveFact = useMutation({
    mutationFn: async (fact: ExtractedFact) => {
      const { isPersistent, needsConfirmation } = classifyPersistence(fact.factKey, fact.confidence);

      // Create entity if specified
      let entityId: string | null = null;
      if (fact.entityType) {
        const { data: existingEntity } = await supabase
          .from('user_memory_entities' as any)
          .select('id')
          .eq('user_id', userId)
          .eq('entity_type', fact.entityType)
          .eq('entity_label', fact.entityLabel ?? fact.factKey)
          .limit(1)
          .single();

        if (existingEntity) {
          entityId = (existingEntity as any).id;
        } else {
          const { data: newEntity } = await supabase
            .from('user_memory_entities' as any)
            .insert({
              user_id: userId,
              session_memory_id: !userId ? sessionMemoryId : null,
              entity_type: fact.entityType,
              entity_label: fact.entityLabel ?? fact.factKey,
              canonical_value_json: fact.factValue,
              confidence_score: fact.confidence,
              status: 'active',
            } as any)
            .select('id')
            .single();
          if (newEntity) entityId = (newEntity as any).id;
        }
      }

      // Check for existing fact with same key
      const existingQuery = supabase
        .from('user_memory_facts' as any)
        .select('id, fact_value_json, confidence_score')
        .eq('fact_key', fact.factKey);

      if (userId) {
        existingQuery.eq('user_id', userId);
      } else {
        existingQuery.eq('session_memory_id', sessionMemoryId);
      }

      const { data: existing } = await existingQuery.limit(1).single();

      if (existing) {
        // Update if new confidence is higher
        if (fact.confidence >= ((existing as any).confidence_score ?? 0)) {
          await supabase
            .from('user_memory_facts' as any)
            .update({
              fact_value_json: fact.factValue,
              confidence_score: fact.confidence,
              is_persistent: isPersistent || fact.isPersistent,
              is_confirmed: !needsConfirmation,
              entity_id: entityId,
              freshness_score: 1.0,
            } as any)
            .eq('id', (existing as any).id);
        }
        return existing;
      }

      // Create source record
      let sourceId: string | null = null;
      const { data: source } = await supabase
        .from('user_memory_sources' as any)
        .insert({
          user_id: userId,
          source_type: fact.sourceType,
          source_label: `${fact.sourceType}:${fact.factKey}`,
        } as any)
        .select('id')
        .single();
      if (source) sourceId = (source as any).id;

      // Insert new fact
      const { data: newFact } = await supabase
        .from('user_memory_facts' as any)
        .insert({
          user_id: userId,
          session_memory_id: !userId ? sessionMemoryId : null,
          entity_id: entityId,
          fact_type: fact.factType,
          fact_key: fact.factKey,
          fact_value_json: fact.factValue,
          confidence_score: fact.confidence,
          freshness_score: 1.0,
          source_id: sourceId,
          is_persistent: isPersistent || fact.isPersistent,
          is_confirmed: !needsConfirmation,
          is_sensitive: false,
          status: needsConfirmation ? 'pending_confirmation' : 'active',
        } as any)
        .select()
        .single();

      return newFact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-memory-facts', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-memory-entities', userId] });
    },
  });

  // Correct a fact
  const correctFact = useMutation({
    mutationFn: async ({
      factId,
      correctedValue,
      reason,
    }: { factId: string; correctedValue: Record<string, unknown>; reason?: string }) => {
      // Get current value
      const { data: current } = await supabase
        .from('user_memory_facts' as any)
        .select('fact_value_json')
        .eq('id', factId)
        .single();

      // Log correction
      if (userId) {
        await supabase.from('user_memory_corrections' as any).insert({
          user_id: userId,
          fact_id: factId,
          previous_value_json: (current as any)?.fact_value_json,
          corrected_value_json: correctedValue,
          correction_reason: reason ?? 'user_correction',
        } as any);
      }

      // Update fact
      await supabase
        .from('user_memory_facts' as any)
        .update({
          fact_value_json: correctedValue,
          is_confirmed: true,
          is_persistent: true,
          confidence_score: 1.0,
          freshness_score: 1.0,
        } as any)
        .eq('id', factId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-memory-facts', userId] });
    },
  });

  // Archive/dismiss a fact
  const dismissFact = useMutation({
    mutationFn: async (factId: string) => {
      await supabase
        .from('user_memory_facts' as any)
        .update({ status: 'archived' } as any)
        .eq('id', factId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-memory-facts', userId] });
    },
  });

  // Promote fact to profile
  const promoteFact = useMutation({
    mutationFn: async (factId: string) => {
      await supabase
        .from('user_memory_facts' as any)
        .update({
          is_persistent: true,
          is_confirmed: true,
          confidence_score: 1.0,
          status: 'active',
        } as any)
        .eq('id', factId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-memory-facts', userId] });
    },
  });

  // Migrate anonymous session to user
  const migrateSessionToUser = useCallback(async (targetUserId: string) => {
    const sid = sessionStorage.getItem(SESSION_MEMORY_KEY);
    if (!sid) return;

    // Update facts
    await supabase
      .from('user_memory_facts' as any)
      .update({ user_id: targetUserId, session_memory_id: null } as any)
      .eq('session_memory_id', sid)
      .is('user_id', null);

    // Update entities
    await supabase
      .from('user_memory_entities' as any)
      .update({ user_id: targetUserId, session_memory_id: null } as any)
      .eq('session_memory_id', sid)
      .is('user_id', null);

    // Update session record
    await supabase
      .from('user_memory_sessions' as any)
      .update({ migrated_to_user_id: targetUserId } as any)
      .eq('session_memory_id', sid);

    queryClient.invalidateQueries({ queryKey: ['user-memory-facts', targetUserId] });
    queryClient.invalidateQueries({ queryKey: ['user-memory-entities', targetUserId] });
  }, [queryClient]);

  // Log reuse
  const logReuse = useCallback(async (
    factId: string,
    context: string,
    surface: string,
    timeSavedSeconds: number
  ) => {
    if (!userId) return;
    await supabase.from('user_memory_reuse_logs' as any).insert({
      user_id: userId,
      fact_id: factId,
      reuse_context: context,
      surface,
      time_saved_seconds: timeSavedSeconds,
    } as any);
  }, [userId]);

  // Build reusable context for Alex / forms
  const reusableContext = useMemo(() => {
    const ctx: Record<string, any> = {};
    for (const f of facts) {
      if (f.is_persistent || f.is_confirmed || f.confidence_score >= 0.7) {
        ctx[f.fact_key] = {
          value: f.fact_value_json,
          confidence: f.confidence_score,
          freshness: computeFreshnessScore(f.updated_at),
          confirmed: f.is_confirmed,
          factId: f.id,
        };
      }
    }
    return ctx;
  }, [facts]);

  // Get specific fact
  const getFact = useCallback((key: string) => {
    return reusableContext[key] ?? null;
  }, [reusableContext]);

  // Check if a key is known
  const isKnown = useCallback((key: string): boolean => {
    return !!reusableContext[key];
  }, [reusableContext]);

  // Time saved estimation
  const timeSavedStats = useMemo(() => {
    const knownKeys = Object.keys(reusableContext);
    const fieldsSkipped = knownKeys.length;
    const estimatedSecondsPerField = 15;
    return {
      fieldsKnown: fieldsSkipped,
      estimatedTimeSaved: fieldsSkipped * estimatedSecondsPerField,
      knownCategories: [...new Set(facts.map(f => f.fact_type))],
    };
  }, [reusableContext, facts]);

  return {
    // Data
    facts,
    entities,
    reusableContext,
    timeSavedStats,
    isLoading: factsLoading || entitiesLoading,

    // Queries
    getFact,
    isKnown,

    // Mutations
    saveFact,
    correctFact,
    dismissFact,
    promoteFact,
    migrateSessionToUser,
    logReuse,
  };
}
