/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

/**
 * Alerte interne : un entrepreneur a vu son plan personnalisé mais n'a pas
 * complété le paiement. Une seule alerte par dossier (dédupliquée en amont).
 */
interface Props {
  businessName?: string
  contactName?: string
  email?: string
  phone?: string
  city?: string
  tradePrimary?: string
  tradeSecondary?: string
  planName?: string
  planPrice?: string
  abandonStep?: string
  source?: string
  affiliate?: string
  resumeUrl?: string
  adminUrl?: string
  quoteId?: string
  auditId?: string
  occurredAt?: string
}

const Row = ({ k, v }: { k: string; v?: string }) =>
  v ? (
    <Text style={rowText}>
      <span style={rowKey}>{k}:</span> <span style={rowVal}>{v}</span>
    </Text>
  ) : null

const ContractorAbandonAdminAlert = ({
  businessName, contactName, email, phone, city, tradePrimary, tradeSecondary,
  planName, planPrice, abandonStep, source, affiliate, resumeUrl, adminUrl,
  quoteId, auditId, occurredAt,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Entrepreneur à relancer : {businessName || 'entreprise inconnue'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Entrepreneur à relancer</Heading>
        <Text style={subtitle}>
          {businessName || 'Entreprise non nommée'}
          {occurredAt ? ` • ${occurredAt}` : ''}
        </Text>

        <Section style={card}>
          <Row k="Entreprise" v={businessName} />
          <Row k="Contact" v={contactName} />
          <Row k="Courriel" v={email} />
          <Row k="Téléphone" v={phone} />
          <Row k="Ville" v={city} />
          <Row k="Métier principal" v={tradePrimary} />
          <Row k="Métier secondaire" v={tradeSecondary} />
        </Section>

        <Section style={card}>
          <Row k="Plan présenté" v={planName} />
          <Row k="Prix présenté" v={planPrice} />
          <Row k="Dernière étape atteinte" v={abandonStep} />
          <Row k="Source" v={source} />
          <Row k="Affilié" v={affiliate} />
        </Section>

        {(resumeUrl || adminUrl) && (
          <Section style={card}>
            {resumeUrl && (
              <Text style={rowText}>
                <Link href={resumeUrl} style={link}>Reprendre le parcours</Link>
              </Text>
            )}
            {adminUrl && (
              <Text style={rowText}>
                <Link href={adminUrl} style={link}>Ouvrir dans l'administration</Link>
              </Text>
            )}
          </Section>
        )}

        <Hr style={hr} />
        <Row k="Devis" v={quoteId} />
        <Row k="Audit" v={auditId} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContractorAbandonAdminAlert,
  subject: (d: Record<string, any>) =>
    `UNPRO — entrepreneur à relancer : ${d.businessName || 'entreprise inconnue'}`,
  displayName: 'Entrepreneur — alerte de relance (interne)',
  previewData: {
    businessName: 'Toiture Tremblay inc.',
    contactName: 'Jean Tremblay',
    email: 'jean@toituretremblay.ca',
    phone: '514 555 1234',
    city: 'Laval',
    tradePrimary: 'Toiture',
    planName: 'Croissance',
    planPrice: '299 $/mois',
    abandonStep: 'Paiement non complété',
    source: 'audit-ia',
    resumeUrl: 'https://unpro.ca/entrepreneur/plan-personnalise/abc',
    quoteId: 'abc',
    occurredAt: '2026-09-20 14:32',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0F172A', margin: '0 0 4px' }
const subtitle = { fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }
const card = { backgroundColor: '#F7F6F0', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', margin: '0 0 14px' }
const rowText = { fontSize: '14px', color: '#0F172A', margin: '0 0 6px', lineHeight: '1.5' }
const rowKey = { color: '#6B7280', fontWeight: 600 as const }
const rowVal = { color: '#0F172A' }
const link = { color: '#1D4ED8', fontWeight: 600 as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
