/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface BookingConfirmationContractorProps {
  contractorName?: string
  serviceType?: string
  date?: string
  time?: string
  clientCity?: string
  bookingUrl?: string
}

const BookingConfirmationContractorEmail = ({
  contractorName, serviceType, date, time, clientCity, bookingUrl,
}: BookingConfirmationContractorProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau rendez-vous confirmé sur {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>UN<span style={{ fontWeight: 800 }}>PRO</span></Text>
        </Section>

        <Heading style={h1}>Un nouveau rendez-vous vous attend.</Heading>

        <Text style={text}>
          Bonjour {contractorName || 'entrepreneur'}, un rendez-vous a été confirmé pour vous.
        </Text>

        <Section style={detailsBox}>
          {serviceType && (
            <Text style={detailRow}>
              <span style={detailLabel}>Projet</span>
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
          {clientCity && (
            <Text style={detailRow}>
              <span style={detailLabel}>Ville</span>
              <span style={detailValue}>{clientCity}</span>
            </Text>
          )}
        </Section>

        <Text style={text}>
          Consultez les détails pour arriver prêt, gagner du temps et offrir la meilleure
          première impression possible.
        </Text>

        <Section style={ctaSection}>
          <Button style={ctaButton} href={bookingUrl || 'https://unpro.ca/pro/dashboard'}>
            Ouvrir le rendez-vous →
          </Button>
        </Section>

        <Section style={reassuranceBox}>
          <Text style={reassuranceText}>
            Plus vous répondez vite et clairement, plus votre expérience sur {SITE_NAME} gagne en force.
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>Alex d'{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationContractorEmail,
  subject: (data: Record<string, any>) =>
    `Nouveau rendez-vous confirmé${data.date ? ` — ${data.date}` : ''}`,
  displayName: 'Confirmation RDV entrepreneur',
  previewData: {
    contractorName: 'Toitures Lapointe',
    serviceType: 'Inspection de toiture',
    date: '15 janvier 2026',
    time: '10h00',
    clientCity: 'Montréal',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: '#3366FF', padding: '20px 28px' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '24px 28px 12px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 28px 16px' }
const detailsBox = { backgroundColor: '#f5f6fa', borderRadius: '10px', padding: '16px 20px', margin: '8px 28px 20px', border: '1px solid #e5e7eb' }
const detailRow = { fontSize: '14px', color: '#1a1f36', margin: '6px 0', lineHeight: '1.5' }
const detailLabel = { color: '#6b7280', fontWeight: '600' as const, minWidth: '80px', display: 'inline-block', textTransform: 'uppercase' as const, fontSize: '11px', letterSpacing: '0.5px' }
const detailValue = { fontWeight: '500' as const }
const ctaSection = { textAlign: 'center' as const, margin: '8px 28px 12px' }
const ctaButton = { backgroundColor: '#3366FF', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: '700' as const, fontSize: '14px', textDecoration: 'none' }
const reassuranceBox = { backgroundColor: '#eff6ff', borderRadius: '10px', padding: '14px 18px', margin: '8px 28px 20px', border: '1px solid #bfdbfe' }
const reassuranceText = { fontSize: '13px', color: '#1d4ed8', margin: '0', fontWeight: '500' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 28px 24px' }
