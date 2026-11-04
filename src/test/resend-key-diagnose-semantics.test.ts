import { describe, it, expect } from "vitest";
import { classifyKeyDiagnose } from "../../supabase/functions/_shared/providerHealthSemantics";

const SEND_ONLY = '{"statusCode":401,"message":"This API key is restricted to only send emails","name":"restricted_api_key"}';
const INVALID = '{"statusCode":401,"message":"API key is invalid","name":"validation_error"}';
const base = { present: true, gatewayKey: true, hasWhitespace: false };

describe("resend-key-diagnose classification", () => {
  it("401 send-only on both probes => send_only_scope_unverified_send, domain UNKNOWN, never gateway_unreachable", () => {
    const v = classifyKeyDiagnose({ ...base, apiKeys: { status: 401, body: SEND_ONLY }, domains: { status: 401, body: SEND_ONLY } });
    expect(v.root_cause).toBe("send_only_scope_unverified_send");
    expect(v.domain_state).toBe("unknown");
    expect(v.repair).not.toMatch(/Full access|reconnect|Rotate/i);
  });
  it("401 invalid => auth rejected, not healthy", () => {
    const v = classifyKeyDiagnose({ ...base, apiKeys: { status: 401, body: INVALID }, domains: { status: 401, body: INVALID } });
    expect(v.root_cause).toBe("gateway_auth_rejected");
  });
  it("mixed send-only + invalid stays a failure", () => {
    const v = classifyKeyDiagnose({ ...base, apiKeys: { status: 401, body: SEND_ONLY }, domains: { status: 401, body: INVALID } });
    expect(v.root_cause).toBe("gateway_auth_rejected");
  });
  it("200 with verified domain => ok_gateway", () => {
    const v = classifyKeyDiagnose({ ...base, apiKeys: { status: 200 }, domains: { status: 200, verified: "unpro.ca" } });
    expect(v).toMatchObject({ root_cause: "ok_gateway", domain_state: "verified" });
  });
  it("200 without verified domain => no_verified_domain", () => {
    const v = classifyKeyDiagnose({ ...base, apiKeys: { status: 200 }, domains: { status: 200, verified: null } });
    expect(v.root_cause).toBe("no_verified_domain");
  });
});
