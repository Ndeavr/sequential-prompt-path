// @ts-nocheck
import { handlePartnerAction } from "../_shared/partnerActions.ts";
Deno.serve((req) => handlePartnerAction(req, "suspend"));
