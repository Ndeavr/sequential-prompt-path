/**
 * officialPersistence — deterministic accounting for official_source_records writes.
 *
 * The registry summary (official_source_registry.last_run_summary) MUST be written
 * AFTER the record upserts, using this accounting, so `persisted` reflects reality
 * and failed chunks are never silently counted as persisted.
 */

export type ChunkOutcome = { size: number; error?: string | null };

export type PersistenceAccounting = {
  attempted: number;
  persisted: number;
  failed: number;
  chunks_total: number;
  chunks_failed: number;
  errors: { chunk_index: number; size: number; message: string }[];
};

/** Split a payload into deterministic fixed-size chunks. */
export function chunkPayload<T>(rows: T[], size = 100): T[][] {
  const out: T[][] = [];
  const step = Math.max(1, size);
  for (let i = 0; i < rows.length; i += step) out.push(rows.slice(i, i + step));
  return out;
}

/** Strip anything that could carry credentials/URLs out of a provider error. */
export function redactPersistError(message: unknown): string {
  const raw = message instanceof Error ? message.message : String(message ?? "unknown_error");
  return raw
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/(key|token|secret|password|apikey|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 300);
}

/** Fold chunk outcomes into an accounting object. A failed chunk never counts as persisted. */
export function accountPersistence(outcomes: ChunkOutcome[]): PersistenceAccounting {
  const acc: PersistenceAccounting = {
    attempted: 0,
    persisted: 0,
    failed: 0,
    chunks_total: outcomes.length,
    chunks_failed: 0,
    errors: [],
  };
  outcomes.forEach((o, index) => {
    acc.attempted += o.size;
    if (o.error) {
      acc.failed += o.size;
      acc.chunks_failed++;
      acc.errors.push({ chunk_index: index, size: o.size, message: redactPersistError(o.error) });
    } else {
      acc.persisted += o.size;
    }
  });
  return acc;
}
