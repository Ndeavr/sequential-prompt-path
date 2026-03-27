/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface PaymentSuccessProps {
  businessName?: string
  planName?: string
  amount?: string
}

const PaymentSuccessEmail = ({ businessName, planName, amount }: PaymentSuccessProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Paiement confirmé — votre plan {planName || 'Pro'} est activé</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>UN<span style={{ fontWeight: 800 }}>PRO</span></Text>
        </Section>

        <Heading style={h1}>Paiement reçu ✓</Heading>

        <Text style={text}>
          {businessName ? `${businessName}, votre` : 'Votre'} plan <strong>{planName || 'Pro'}</strong> est maintenant actif.
          {amount && ` Montant : ${amount}.`}
        </Text>

        <Section style={stepsBox}>
          <Text style={stepTitle}>Prochaines étapes</Text>
          <Text style={stepItem}>1. Complétez votre profil entrepreneur</Text>
          <Text style={stepItem}>2. Connectez votre agenda</Text>
          <Text style={stepItem}>3. Recevez vos premiers rendez-vous qualifiés</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://unpro.ca/activation">
            Compléter mon profil →
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Reçu envoyé par {SITE_NAME}. Conservez cet email pour vos dossiers.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentSuccessEmail,
  subject: (data: Record<string, any>) =>
    `Paiement confirmé — Plan ${data.planName || 'Pro'} activé`,
  displayName: 'Paiement réussi',
  previewData: {
    businessName: 'Toitures Lapointe',
    planName: 'Premium',
    amount: '149$/mois',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: '#3366FF', padding: '20px 28px' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '24px 28px 12px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 28px 16px' }
const stepsBox = { backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '16px 20px', margin: '8px 28px 20px', border: '1px solid #bbf7d0' }
const stepTitle = { fontSize: '13px', fontWeight: '700' as const, color: '#15803d', margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const stepItem = { fontSize: '14px', color: '#1a1f36', margin: '4px 0', lineHeight: '1.5' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 28px 24px' }
const ctaButton = { backgroundColor: '#3366FF', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: '700' as const, fontSize: '14px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '20px 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 28px 24px' }
