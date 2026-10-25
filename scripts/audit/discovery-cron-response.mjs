/** Offline classification only. No network, database, scheduling or retries. */
export function classifyDiscoveryResponse({ requestId, responseId, statusCode, timedOut = false, body } = {}) {
  if (!Number.isSafeInteger(requestId) || requestId <= 0) return { state: "not_enqueued" };
  if (responseId !== requestId) return { state: "response_unverified" };
  if (timedOut) return { state: "transport_failed" };
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) return { state: "response_unverified" };
  if (statusCode === 401) return { state: "unauthorized", statusCode };
  if (statusCode === 403) return { state: "forbidden", statusCode };
  if (statusCode >= 500) return { state: "server_failed", statusCode };
  if (statusCode < 200 || statusCode >= 300) return { state: "http_failed", statusCode };
  if (!body || typeof body !== "object" || Array.isArray(body)) return { state: "response_unverified", statusCode };
  if (body.blocked === true || body.recruitment_locked === true) return { state: "blocked", statusCode };
  if (body.ok !== true || (Array.isArray(body.errors) && body.errors.length > 0)) return { state: "application_failed", statusCode };
  // HTTP acknowledgement is never proof of discovery, import or sending.
  return { state: body.dry_run === true ? "dry_run_acknowledged" : "http_acknowledged", statusCode };
}