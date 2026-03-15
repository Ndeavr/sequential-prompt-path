/**
 * UNPRO — Document Extraction Types
 * Typed contract for the Quote & Contract Analyzer.
 * Every extracted field carries a confidence level and source snippet.
 */

export type AnalyzableDocType =
  | "quote"
  | "estimate"
  | "contract"
  | "invoice"
  | "proposal"
  | "work_agreement"
  | "scanned_document"
  | "unknown";

export type ExtractionConfidence = "high" | "medium" | "low" | "not_found";

export interface ExtractedField {
  value: string | null;
  confidence: ExtractionConfidence;
  /** Source text snippet from the document where this was found */
  source_snippet: string | null;
}

export interface DocumentExtractionResult {
  /** Unique extraction ID */
  extraction_id: string;
  /** Detected document type */
  document_type: AnalyzableDocType;
  /** Overall document quality / readability */
  document_clarity: "clear" | "partial" | "poor";

  /** Contractor identity clues */
  business_name: ExtractedField;
  legal_name: ExtractedField;
  phone: ExtractedField;
  email: ExtractedField;
  website: ExtractedField;
  rbq_number: ExtractedField;
  neq: ExtractedField;
  address: ExtractedField;
  city: ExtractedField;

  /** Client / project info */
  client_name: ExtractedField;
  project_address: ExtractedField;

  /** Financial info */
  date: ExtractedField;
  total_price: ExtractedField;
  taxes: ExtractedField;
  payment_terms: ExtractedField;

  /** Scope info */
  scope_of_work: ExtractedField;
  warranties: ExtractedField;
  exclusions: ExtractedField;
  signature_blocks: ExtractedField;
}

export interface DocumentMismatch {
  field: string;
  document_value: string;
  profile_value: string;
  severity: "info" | "warning" | "concern";
  message_fr: string;
}

export interface DocumentAnalysisResult {
  extraction: DocumentExtractionResult;
  /** Fields that strengthen contractor matching */
  identity_clues_found: string[];
  /** What the document confirms about the contractor */
  confirmations: string[];
  /** What remains unconfirmed */
  unconfirmed: string[];
  /** Detected mismatches with known profile data */
  mismatches: DocumentMismatch[];
  /** Suggested next steps for the homeowner */
  suggested_next_steps: string[];
  /** Whether this can link to a verification run */
  linked_verification_run_id: string | null;
  /** Whether contractor was matched */
  matched_contractor_id: string | null;
}
