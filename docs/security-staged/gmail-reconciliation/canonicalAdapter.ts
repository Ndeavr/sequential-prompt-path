// STAGED ONLY. Bind this to the existing verified service caller and Gmail
// gateway reader; no endpoint, credentials or new table is created here.
import { reconcileGmail, type Dependencies } from './handler';
type QueryResult<T> = { data: T | null; error: { message: string } | null };
type Backend = {
  from: (table: 'outreach_email_events') => {
    select: (fields: string) => { eq: (field: string, value: string) => {
      maybeSingle: () => Promise<QueryResult<{ message_id: string; recipient: string; metadata: Record<string, unknown> }>>;
    } };
  };
  rpc: (name: 'record_email_event' | 'record_engagement_event', parameters: Record<string, unknown>) => Promise<QueryResult<unknown>>;
};
export function canonicalAdapter(backend: Backend, provider: Pick<Dependencies,
  'authorizeService' | 'gmailMessage' | 'gmailThread' | 'now'>) {
  const dependencies: Dependencies = {
    ...provider,
    stored: async id => {
      const result = await backend.from('outreach_email_events')
        .select('message_id,recipient,metadata').eq('message_id', id).maybeSingle();
      if (result.error) throw new Error('canonical_lookup_failed');
      return result.data;
    },
    recordEmail: async (id, kind, payload) => {
      const result = await backend.rpc('record_email_event', { p_message_id: id, p_kind: kind, p_payload: payload });
      if (result.error || !result.data) throw new Error('canonical_email_write_failed');
    },
    recordAudit: async payload => {
      const result = await backend.rpc('record_engagement_event', payload);
      if (result.error || !result.data) throw new Error('canonical_audit_write_failed');
    },
  };
  return (request: Request) => reconcileGmail(request, dependencies);
}