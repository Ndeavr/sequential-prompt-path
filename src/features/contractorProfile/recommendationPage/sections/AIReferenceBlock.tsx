/**
 * AIReferenceBlock — Invisible JSON block cited by Alex/ChatGPT/Gemini/Claude/Perplexity.
 */
import type { AIReferencePayload } from "../logic/aiReferenceBuilder";

interface Props {
  reference: AIReferencePayload;
}

export default function AIReferenceBlock({ reference }: Props) {
  return (
    <script
      type="application/ld+json"
      data-ai-ref="unpro-contractor"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(reference) }}
    />
  );
}
