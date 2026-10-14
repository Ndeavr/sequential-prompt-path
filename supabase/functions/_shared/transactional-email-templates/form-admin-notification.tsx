/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  formLabel?: string
  formType?: string
  referenceCode?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  sourcePage?: string
  utmSource?: string
  utmCampaign?: string
  payload?: Record<string, any>
}

const Row = ({ k, v }: { k: string; v?: string }) =>
  v ? (
    <Text style={rowText}>
      <span style={rowKey}>{k}:</span> <span style={rowVal}>{v}</span>
    </Text>
  ) : null

const FormAdminNotification = ({
  formLabel, formType, referenceCode, firstName, lastName, email, phone, company,
  sourcePage, utmSource, utmCampaign, payload,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouvelle soumission {formLabel || formType}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouvelle soumission</Heading>
        <Text style={subtitle}>{formLabel || formType} {referenceCode ? `• ${referenceCode}` : ''}</Text>

        <Section style={card}>
          <Row k="Nom" v={[firstName, lastName].filter(Boolean).join(' ')} />
          <Row k="Courriel" v={email} />
          <Row k="Téléphone" v={phone} />
          <Row k="Entreprise" v={company} />
        </Section>

        {payload && Object.keys(payload).length > 0 && (
          <Section style={card}>
            <Text style={sectionTitle}>Données du formulaire</Text>
            {Object.entries(payload).map(([k, v]) => (
              <Row key={k} k={k} v={typeof v === 'string' ? v : JSON.stringify(v)} />
            ))}
          </Section>
        )}

        <Hr style={hr} />
        <Row k="Page" v={sourcePage} />
        <Row k="UTM source" v={utmSource} />
        <Row k="UTM campaign" v={utmCampaign} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FormAdminNotification,
  subject: (d: Record<string, any>) =>
    `Nouvelle soumission • ${d.formLabel || d.formType || 'Formulaire'}${d.referenceCode ? ` • ${d.referenceCode}` : ''}`,
  displayName: 'Form — notification admin',
  previewData: {
    formLabel: 'Partenaire Certifié',
    formType: 'partner_application',
    referenceCode: 'UNP-PART-7K2X9A',
    firstName: 'Jean', lastName: 'Tremblay',
    email: 'jean@example.com', phone: '514-555-1234', company: 'Acme inc.',
    sourcePage: '/partenaires', utmSource: 'linkedin', utmCampaign: 'launch',
    payload: { message: 'Très intéressé par le programme.' },
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0F172A', margin: '0 0 4px' }
const subtitle = { fontSize: '14px', color: '#6B7280', margin: '0 0 20px' }
const card = { backgroundColor: '#F7F6F0', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', margin: '0 0 14px' }
const sectionTitle = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#6B7280', margin: '0 0 10px' }
const rowText = { fontSize: '14px', color: '#0F172A', margin: '0 0 6px', lineHeight: '1.5' }
const rowKey = { color: '#6B7280', fontWeight: 600 as const }
const rowVal = { color: '#0F172A' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
