/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface ContractorProfileActivatedProps {
  companyName?: string
}

const ContractorProfileActivatedEmail = ({ companyName }: ContractorProfileActivatedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre profil {SITE_NAME} est maintenant actif</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>UN<span style={{ fontWeight: 800 }}>PRO</span></Text>
        </Section>

        <Heading style={h1}>Votre profil est actif.</Heading>

        <Text style={text}>
          Bonjour {companyName || 'entrepreneur'}, votre profil {SITE_NAME} est maintenant actif.
        </Text>

        <Text style={text}>
          Vous pouvez consulter votre tableau de bord, compléter les derniers détails utiles
          et suivre vos prochaines opportunités.
        </Text>

        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://unpro.ca/pro/dashboard">
            Ouvrir mon tableau de bord →
          </Button>
        </Section>

        <Section style={reassuranceBox}>
          <Text style={reassuranceText}>
            Votre profil peut encore être amélioré pour gagner en précision, visibilité et conversion.
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>Alex d'{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContractorProfileActivatedEmail,
  subject: 'Votre profil UNPRO est maintenant actif',
  displayName: 'Profil entrepreneur activé',
  previewData: { companyName: 'Toitures Lapointe' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: '#3366FF', padding: '20px 28px' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '24px 28px 12px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 28px 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 28px 12px' }
const ctaButton = { backgroundColor: '#3366FF', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: '700' as const, fontSize: '14px', textDecoration: 'none' }
const reassuranceBox = { backgroundColor: '#eff6ff', borderRadius: '10px', padding: '14px 18px', margin: '8px 28px 20px', border: '1px solid #bfdbfe' }
const reassuranceText = { fontSize: '13px', color: '#1d4ed8', margin: '0', fontWeight: '500' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 28px 24px' }
