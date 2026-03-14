/**
 * UNPRO — Agent Orchestration
 * Barrel for agent job definitions.
 * DB tables already exist: agent_registry, agent_tasks, agent_logs, agent_memory, agent_metrics.
 * Edge function: supabase/functions/agent-orchestrator/index.ts
 * Hook: src/hooks/useAgentOrchestrator.ts
 *
 * Future agents (Phase 11):
 * - completion-agent: drives Passeport Maison completion
 * - home-score-agent: recalculates Home Score on events
 * - grants-agent: monitors grant eligibility changes
 * - contractor-trust-agent: recalculates trust scores
 * - neighborhood-forecast-agent: area intelligence
 * - seo-builder-agent: generates/refreshes SEO pages
 * - messaging-orchestrator: homeowner notification sequences
 */
