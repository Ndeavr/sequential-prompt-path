/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface EntrepreneurWelcomeProps {
  businessName?: string
  ownerName?: string
}

const EntrepreneurWelcomeEmail = ({ businessName, ownerName }: EntrepreneurWelcomeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {SITE_NAME} — votre profil est créé</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Text style={logoText}>UN<span style={{ fontWeight: 800 }}>PRO</span></Text>
        </Section>

        <Heading style={h1}>
          {ownerName ? `Bienvenue, ${ownerName}!` : 'Bienvenue sur UNPRO!'}
        </Heading>

        <Text style={text}>
          {businessName ? `${businessName} est` : 'Votre entreprise est'} maintenant sur UNPRO.
          Vous êtes à quelques étapes de recevoir des rendez-vous qualifiés directement dans votre agenda.
        </Text>

        <Section style={valueBox}>
          <Text style={valueTitle}>Ce qui vous attend</Text>
          <Text style={valueItem}>✓ Des propriétaires qualifiés dans votre zone</Text>
          <Text style={valueItem}>✓ Rendez-vous livrés sans cold-call</Text>
          <Text style={valueItem}>✓ Profil vérifié = confiance immédiate</Text>
          <Text style={valueItem}>✓ Alex, votre assistant IA, gère le matching</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://unpro.ca/activation">
            Compléter mon profil →
          </Button>
        </Section>

        <Text style={subtext}>
          Ça prend 3 minutes. Plus votre profil est complet, plus vos rendez-vous sont qualifiés.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Envoyé par {SITE_NAME}. Vous recevez cet email car vous avez créé un profil entrepreneur.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EntrepreneurWelcomeEmail,
  subject: 'Bienvenue sur UNPRO — complétez votre profil',
  displayName: 'Bienvenue entrepreneur',
  previewData: {
    businessName: 'Toitures Lapointe',
    ownerName: 'Jean-Pierre',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '520px', margin: '0 auto' }
const logoBanner = { backgroundColor: '#3366FF', padding: '20px 28px' }
const logoText = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1f36', margin: '24px 28px 12px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 28px 16px' }
const valueBox = { backgroundColor: '#eff6ff', borderRadius: '10px', padding: '16px 20px', margin: '8px 28px 20px', border: '1px solid #bfdbfe' }
const valueTitle = { fontSize: '13px', fontWeight: '700' as const, color: '#1d4ed8', margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const valueItem = { fontSize: '14px', color: '#1a1f36', margin: '4px 0', lineHeight: '1.5' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 28px 12px' }
const ctaButton = { backgroundColor: '#3366FF', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: '700' as const, fontSize: '14px', textDecoration: 'none' }
const subtext = { fontSize: '13px', color: '#6b7280', margin: '0 28px 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 28px 24px' }
