/**
 * UNPRO — Agent Orchestration
 * Barrel for agent definitions and tracking services.
 * DB tables: agent_registry, agent_tasks, agent_logs, agent_memory, agent_metrics, platform_events.
 * Edge function: supabase/functions/agent-orchestrator/index.ts
 * Hook: src/hooks/useAgentOrchestrator.ts
 *
 * Active agents:
 * - passport-completion-agent: drives Passeport Maison completion
 * - home-score-agent: recalculates Home Score on events
 * - grants-agent: monitors grant eligibility changes
 * - contractor-trust-agent: recalculates trust scores
 * - neighborhood-forecast-agent: area intelligence
 * - seo-builder-agent: generates/refreshes SEO pages
 * - messaging-orchestrator: homeowner notification sequences
 */
export { trackEvent, type EventCategory } from "@/services/eventTrackingService";
