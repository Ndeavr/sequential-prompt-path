import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "UNPRO"

interface ProspectOutreachProps {
  companyName?: string
  city?: string
  category?: string
}

const ProspectOutreachEmail = ({ companyName, city, category }: ProspectOutreachProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {companyName
        ? `${companyName}, découvrez votre potentiel de croissance avec ${SITE_NAME}`
        : `Découvrez votre potentiel de croissance avec ${SITE_NAME}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {companyName ? `Bonjour ${companyName},` : 'Bonjour,'}
        </Heading>

        <Text style={text}>
          Nous avons identifié une opportunité de croissance pour votre entreprise
          {city ? ` à ${city}` : ''}
          {category ? ` dans le domaine ${category}` : ''}.
        </Text>

        <Text style={text}>
          Avec <strong>{SITE_NAME}</strong>, recevez des rendez-vous qualifiés directement dans votre calendrier — sans cold-call, sans soumissions perdues.
        </Text>

        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://unpro.ca/entrepreneur/plan">
            Découvrir mon potentiel →
          </Button>
        </Section>

        <Text style={textSmall}>
          ✓ Rendez-vous pré-qualifiés dans votre région{'\n'}
          ✓ Zéro appel à froid{'\n'}
          ✓ Résultats dès la première semaine
        </Text>

        <Text style={footer}>
          L'équipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProspectOutreachEmail,
  subject: ({ companyName }: Record<string, any>) =>
    companyName
      ? `${companyName}, votre potentiel de croissance vous attend`
      : 'Votre potentiel de croissance vous attend',
  displayName: 'Prospect outreach',
  previewData: { companyName: 'Toiture ABC', city: 'Laval', category: 'Toiture' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0F172A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: '#6B7280', lineHeight: '1.8', margin: '0 0 24px', whiteSpace: 'pre-line' as const }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const ctaButton = {
  backgroundColor: '#2563EB',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '32px 0 0' }
