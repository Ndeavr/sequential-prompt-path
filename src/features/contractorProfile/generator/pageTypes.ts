/**
 * UNPRO — Contractor Profile Generator V2
 * Schema-locked page types. AI never emits JSX — only schema-valid JSON.
 */
import { z } from "zod";

export const PAGE_TYPES = ["contractor_registry", "contractor_recommendation", "contractor_reasoning"] as const;
export type ContractorPageType = (typeof PAGE_TYPES)[number];

export const MEDIA_CATEGORIES = ["logo", "team", "vehicle", "completed_project", "before_after", "service"] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const CONTENT_LANGUAGES = ["fr", "en"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export const MediaAssetSchema = z.object({
  url: z.string().url().or(z.literal("")),
  category: z.enum(MEDIA_CATEGORIES),
  alt: z.string().min(1),
  verified: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const LogoSchema = z.object({
  url: z.string().url().nullable(),
  verified: z.boolean().default(false),
  monogram: z.object({
    initials: z.string().min(1).max(4),
    bg: z.string().default("#0F1A2E"),
    fg: z.string().default("#F5C542"),
  }),
});
export type ContractorLogo = z.infer<typeof LogoSchema>;

export const FaqItemSchema = z.object({
  question: z.string().min(4),
  answer: z.string().min(10),
});

export const CtaSchema = z.object({
  book_appointment: z.string().min(1),
  alex: z.string().min(1),
  evaluation: z.string().min(1),
});

export const ContractorPageSchema = z.object({
  page_type: z.enum(PAGE_TYPES),
  language: z.enum(CONTENT_LANGUAGES),
  contractor_id: z.string().uuid(),
  slug: z.string().min(1),
  canonical_url: z.string().url(),
  business_name: z.string().min(2),
  legal_name: z.string().optional(),
  logo: LogoSchema,
  hero: z.object({
    tagline: z.string().min(4),
    territories: z.array(z.string()).min(1),
    phone: z.string().min(7),
    website: z.string().url().optional(),
  }),
  description: z.string().min(80),
  gallery: z.array(MediaAssetSchema),
  faqs: z.array(FaqItemSchema),
  ctas: CtaSchema,
  service_area: z.array(z.string()).min(1),
  service_types: z.array(z.string()).min(1),
  rating: z.object({ value: z.number(), count: z.number() }).optional(),
});
export type ContractorPageInput = z.infer<typeof ContractorPageSchema>;

export const MEDIA_MINIMUM = 6;
export const FAQ_MINIMUM = 5;
export const PUBLISH_SCORE_MINIMUM = 90;
