/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface BookingConfirmationProps {
  clientName?: string
  contractorName?: string
  serviceType?: string
  date?: string
  time?: string
  address?: string
}

const BookingConfirmationEmail = ({
  clientName, contractorName, serviceType, date, time, address,
}: BookingConfirmationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre rendez-vous {SITE_NAME} est confirmé</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>UN<span style={{ fontWeight: 800 }}>PRO</span></Text>
        </Section>

        <Heading style={h1}>
          {clientName ? `${clientName}, c'est confirmé ✓` : 'Rendez-vous confirmé ✓'}
        </Heading>

        <Text style={text}>
          Votre rendez-vous avec <strong>{contractorName || 'votre entrepreneur'}</strong> est réservé.
        </Text>

        <Section style={detailsBox}>
          {serviceType && (
            <Text style={detailRow}>
              <span style={detailLabel}>Service</span>
              <span style={detailValue}>{serviceType}</span>
            </Text>
          )}
          {date && (
            <Text style={detailRow}>
              <span style={detailLabel}>Date</span>
              <span style={detailValue}>{date}</span>
            </Text>
          )}
          {time && (
            <Text style={detailRow}>
              <span style={detailLabel}>Heure</span>
              <span style={detailValue}>{time}</span>
            </Text>
          )}
          {address && (
            <Text style={detailRow}>
              <span style={detailLabel}>Adresse</span>
              <span style={detailValue}>{address}</span>
            </Text>
          )}
        </Section>

        <Text style={text}>
          L'entrepreneur vous contactera avant la visite pour confirmer les détails.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Cet email a été envoyé par {SITE_NAME} suite à votre réservation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Rendez-vous confirmé${data.date ? ` — ${data.date}` : ''}`,
  displayName: 'Confirmation de rendez-vous',
  previewData: {
    clientName: 'Marie',
    contractorName: 'Toitures Lapointe',
    serviceType: 'Inspection de toiture',
    date: '15 janvier 2026',
    time: '10h00',
    address: '123 rue des Érables, Montréal',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: '#3366FF', padding: '20px 28px', borderRadius: '0' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '24px 28px 12px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 28px 16px' }
const detailsBox = { backgroundColor: '#f5f6fa', borderRadius: '10px', padding: '16px 20px', margin: '8px 28px 20px', border: '1px solid #e5e7eb' }
const detailRow = { fontSize: '14px', color: '#1a1f36', margin: '6px 0', display: 'flex' as const, lineHeight: '1.5' }
const detailLabel = { color: '#6b7280', fontWeight: '600' as const, minWidth: '80px', display: 'inline-block', textTransform: 'uppercase' as const, fontSize: '11px', letterSpacing: '0.5px' }
const detailValue = { fontWeight: '500' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 28px 24px' }
