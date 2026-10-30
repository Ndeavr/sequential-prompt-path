import { useEffect, useState } from "react";
import { resolveProposal, type AffiliateProposal } from "../proposalService";

/** Bearer-link context is resolved by the server; never trust ref/prospect URL overrides. */
export function useProposalContext(token: string | null) {
  const [state, setState] = useState<{ proposal: AffiliateProposal | null; error: string | null; loading: boolean }>({ proposal: null, error: null, loading: Boolean(token) });
  useEffect(() => {
    let active = true;
    if (!token) { setState({ proposal: null, error: null, loading: false }); return; }
    setState({ proposal: null, error: null, loading: true });
    void resolveProposal(token).then(proposal => {
      if (active) setState({ proposal, error: null, loading: false });
    }).catch(error => { if (active) setState({ proposal: null, error: error.message, loading: false }); });
    return () => { active = false; };
  }, [token]);
  return state;
}