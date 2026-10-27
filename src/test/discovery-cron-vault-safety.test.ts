// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "docs/migrations-staged/20261027_discovery_cron_282_vault_auth.sql";
const sql = readFileSync(path, "utf8");
const handler = readFileSync("supabase/functions/acquisition-discovery-cycle/index.ts", "utf8");

describe("staged cron #282 secure identity (no production writes)", () => {
  it("alters ONLY the existing 282 job and refuses target mismatch", () => {
    expect(sql).toMatch(/WHERE jobid = 282/);
    expect(sql).toContain("jobname IS DISTINCT FROM 'unpro-acquisition-discovery-6h'");
    expect(sql).toContain("PERFORM cron.alter_job(");
    expect(sql).not.toMatch(/cron\.(?:schedule|unschedule)\s*\(/);
  });
  it("reads Bearer service credential from runtime Vault without embedding a key", () => {
    expect(sql).toContain("vault.decrypted_secrets");
    expect(sql).toContain("'Authorization', 'Bearer ' ||");
    expect(sql).toContain("email_queue_service_role_key");
    expect(sql).not.toMatch(/eyJ[a-zA-Z0-9_-]{18,}/);
    expect(sql).not.toMatch(/sb_secret_[a-zA-Z0-9_-]+/);
  });
  it("cannot enqueue while either discovery or recruitment is disabled", () => {
    expect(sql).toContain("DISCOVERY_ENABLED");
    expect(sql).toContain("global_enabled IS TRUE AND autonomous_enqueue_enabled IS TRUE");
    expect(handler).toContain("requireAdminCaller(req");
    expect(handler).toContain("if (!discoveryEnabled)");
    expect(handler).toContain("autonomous_enqueue_enabled");
  });
  it("does not reenable old acquisition workers or send anything", () => {
    expect(sql).not.toMatch(/\b(?:UPDATE|INSERT\s+INTO)\s+(?:public\.)?(?:recruitment_controls|agent_outreach_messages|acquisition_queue)\b/i);
    expect(sql).not.toContain("send-verified-batch");
    expect(sql).not.toContain("twilio");
    expect(sql).toContain("cron.job_run_details.succeeded means pg_net *enqueued* a request");
  });
});
