/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface PaymentFailedProps {
  firstName?: string
  planName?: string
  retryUrl?: string
}

const PaymentFailedEmail = ({ firstName, planName, retryUrl }: PaymentFailedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Action requise — votre paiement n'a pas été complété</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>UN<span style={{ fontWeight: 800 }}>PRO</span></Text>
        </Section>

        <Heading style={h1}>Votre paiement n'a pas abouti.</Heading>

        <Text style={text}>
          Bonjour {firstName || 'là'}, nous n'avons pas pu confirmer votre paiement
          pour <strong>{planName || 'votre plan'}</strong>.
        </Text>

        <Text style={text}>
          Cela arrive. Il suffit généralement de réessayer ou de mettre à jour votre
          mode de paiement pour finaliser votre accès.
        </Text>

        <Section style={ctaSection}>
          <Button style={ctaButton} href={retryUrl || 'https://unpro.ca/checkout'}>
            Reprendre le paiement →
          </Button>
        </Section>

        <Section style={ctaSecondarySection}>
          <Button style={ctaSecondary} href="https://unpro.ca/checkout?action=update-payment">
            Mettre à jour mon mode de paiement
          </Button>
        </Section>

        <Section style={reassuranceBox}>
          <Text style={reassuranceText}>
            ✓ Votre progression est conservée. Vous ne repartez pas de zéro.
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>Facturation {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: (data: Record<string, any>) =>
    `Action requise — paiement ${data.planName || ''} non complété`,
  displayName: 'Paiement échoué',
  previewData: {
    firstName: 'Jean-Pierre',
    planName: 'Premium',
    retryUrl: 'https://unpro.ca/checkout?retry=1',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: '#3366FF', padding: '20px 28px' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '24px 28px 12px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 28px 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 28px 8px' }
const ctaButton = { backgroundColor: '#3366FF', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontWeight: '700' as const, fontSize: '15px', textDecoration: 'none' }
const ctaSecondarySection = { textAlign: 'center' as const, margin: '0 28px 20px' }
const ctaSecondary = { backgroundColor: 'transparent', color: '#3366FF', padding: '10px 24px', borderRadius: '8px', fontWeight: '600' as const, fontSize: '13px', textDecoration: 'underline', border: 'none' }
const reassuranceBox = { backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '14px 18px', margin: '8px 28px 20px', border: '1px solid #bbf7d0' }
const reassuranceText = { fontSize: '13px', color: '#15803d', margin: '0', fontWeight: '500' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 28px 24px' }
