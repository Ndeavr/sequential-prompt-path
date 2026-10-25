// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyDiscoveryResponse } from "../../scripts/audit/discovery-cron-response.mjs";

describe("offline cron HTTP evidence, never scheduler success", () => {
  it("SQL request id alone proves only enqueue, not response", () => {
    expect(classifyDiscoveryResponse({ requestId: 282 }).state).toBe("response_unverified");
  });
  it("no request id means enqueue is unverified", () => {
    expect(classifyDiscoveryResponse({}).state).toBe("not_enqueued");
  });
  it.each([[401, "unauthorized"], [403, "forbidden"], [500, "server_failed"], [503, "server_failed"], [302, "http_failed"]])("HTTP %s is %s even with ok:true", (statusCode, state) => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, statusCode, body: { ok: true } }).state).toBe(state);
  });
  it("response from another request cannot prove success", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 2, statusCode: 200, body: { ok: true } }).state).toBe("response_unverified");
  });
  it("timeout is failure", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, timedOut: true }).state).toBe("transport_failed");
  });
  it("2xx without parsed application evidence is unverified", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, statusCode: 200 }).state).toBe("response_unverified");
  });
  it("closed recruitment is blocked despite dry_run ok:true", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, statusCode: 200, body: { ok: true, dry_run: true, recruitment_locked: true } }).state).toBe("blocked");
  });
  it("2xx with application errors is failure", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, statusCode: 200, body: { ok: true, errors: [{}] } }).state).toBe("application_failed");
  });
  it("valid dry run proves only dry-run acknowledgement", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, statusCode: 200, body: { ok: true, dry_run: true } }).state).toBe("dry_run_acknowledged");
  });
  it("valid 2xx never becomes business success", () => {
    expect(classifyDiscoveryResponse({ requestId: 1, responseId: 1, statusCode: 200, body: { ok: true } }).state).toBe("http_acknowledged");
  });
});