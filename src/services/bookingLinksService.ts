/**
 * UNPRO Booking Intelligence — Link & QR Distribution Service
 * Generates booking links, QR codes, and branded share assets.
 */

import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

// ─── Types ───

export interface BookingLinkInput {
  contractorId: string;
  contractorSlug: string;
  appointmentTypeId?: string;
  appointmentTypeSlug?: string;
  title: string;
  sourceTag?: string;
  city?: string;
  service?: string;
  alexMode?: boolean;
}

export interface BookingLink {
  id: string;
  url: string;
  qrCodeDataUrl: string;
  slug: string;
  title: string;
  sourceTag: string | null;
}

// ─── QR Link Presets ───

export type QrPresetKey =
  | "soumission"
  | "urgence"
  | "expertise"
  | "alex"
  | "video"
  | "condo"
  | "email_signature"
  | "truck_sticker"
  | "invoice_footer";

export interface QrPreset {
  key: QrPresetKey;
  label: string;
  description: string;
  icon: string;
  sourceTag: string;
  appointmentSlug?: string;
  alexMode?: boolean;
}

export const QR_PRESETS: QrPreset[] = [
  {
    key: "soumission",
    label: "QR Soumission gratuite",
    description: "Lien direct vers la soumission gratuite",
    icon: "clipboard-check",
    sourceTag: "qr_soumission",
    appointmentSlug: "soumission-gratuite",
  },
  {
    key: "urgence",
    label: "QR Urgence",
    description: "Accès rapide au créneau d'urgence",
    icon: "alert-triangle",
    sourceTag: "qr_urgence",
    appointmentSlug: "urgence",
  },
  {
    key: "expertise",
    label: "QR Expertise",
    description: "Réserver une expertise approfondie",
    icon: "search",
    sourceTag: "qr_expertise",
    appointmentSlug: "expertise",
  },
  {
    key: "alex",
    label: "QR Alex IA",
    description: "Parler à Alex pour être guidé",
    icon: "bot",
    sourceTag: "qr_alex",
    alexMode: true,
  },
  {
    key: "video",
    label: "QR Consultation vidéo",
    description: "Réserver une consultation vidéo",
    icon: "video",
    sourceTag: "qr_video",
    appointmentSlug: "consultation-video",
  },
  {
    key: "condo",
    label: "QR Condo / Syndicat",
    description: "Rencontre copropriété ou gestionnaire",
    icon: "building",
    sourceTag: "qr_condo",
    appointmentSlug: "rencontre-condo",
  },
  {
    key: "email_signature",
    label: "QR Signature courriel",
    description: "À insérer dans votre signature email",
    icon: "mail",
    sourceTag: "qr_email",
  },
  {
    key: "truck_sticker",
    label: "QR Camion / Pancarte",
    description: "Pour véhicule, pancarte ou autocollant",
    icon: "truck",
    sourceTag: "qr_truck",
  },
  {
    key: "invoice_footer",
    label: "QR Facture / Soumission PDF",
    description: "À ajouter en pied de page de vos documents",
    icon: "file-text",
    sourceTag: "qr_invoice",
  },
];

// ─── URL Builder ───

export function buildBookingUrl(params: {
  contractorSlug: string;
  appointmentSlug?: string;
  source?: string;
  city?: string;
  service?: string;
  alexMode?: boolean;
}): string {
  const base = `${window.location.origin}/book/${params.contractorSlug}`;

  if (params.alexMode) {
    return `${base}/alex${params.source ? `?source=${params.source}` : ""}`;
  }

  if (params.appointmentSlug) {
    const path = params.city
      ? `${base}/${params.appointmentSlug}/${params.city}`
      : `${base}/${params.appointmentSlug}`;
    return params.source ? `${path}?source=${params.source}` : path;
  }

  return params.source ? `${base}?source=${params.source}` : base;
}

// ─── QR Code Generator ───

export async function generateQrCodeDataUrl(
  url: string,
  options?: { width?: number; margin?: number; color?: string }
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: options?.width ?? 400,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color ?? "#1a1a2e",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

// ─── Create & Persist Booking Link ───

export async function createBookingLink(input: BookingLinkInput): Promise<BookingLink> {
  const url = buildBookingUrl({
    contractorSlug: input.contractorSlug,
    appointmentSlug: input.appointmentTypeSlug,
    source: input.sourceTag,
    city: input.city,
    service: input.service,
    alexMode: input.alexMode,
  });

  const qrCodeDataUrl = await generateQrCodeDataUrl(url);

  const slug = [
    input.contractorSlug,
    input.appointmentTypeSlug,
    input.sourceTag,
    input.city,
  ]
    .filter(Boolean)
    .join("-");

  const { data, error } = await supabase
    .from("booking_links")
    .insert({
      contractor_id: input.contractorId,
      appointment_type_id: input.appointmentTypeId ?? null,
      slug,
      title: input.title,
      source_tag: input.sourceTag ?? null,
      city: input.city ?? null,
      service: input.service ?? null,
      alex_mode: input.alexMode ?? false,
      qr_code_url: qrCodeDataUrl,
      is_active: true,
    } as any)
    .select("id")
    .single();

  if (error) throw error;

  return {
    id: (data as any).id,
    url,
    qrCodeDataUrl,
    slug,
    title: input.title,
    sourceTag: input.sourceTag ?? null,
  };
}

// ─── Generate All Preset Links ───

export async function generateAllPresetLinks(
  contractorId: string,
  contractorSlug: string
): Promise<BookingLink[]> {
  const links: BookingLink[] = [];

  for (const preset of QR_PRESETS) {
    try {
      const link = await createBookingLink({
        contractorId,
        contractorSlug,
        title: preset.label,
        appointmentTypeSlug: preset.appointmentSlug,
        sourceTag: preset.sourceTag,
        alexMode: preset.alexMode,
      });
      links.push(link);
    } catch {
      // Skip if duplicate
    }
  }

  return links;
}

// ─── Fetch Existing Links ───

export async function fetchBookingLinks(contractorId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("booking_links")
    .select("*")
    .eq("contractor_id", contractorId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
