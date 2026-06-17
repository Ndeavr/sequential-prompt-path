import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  company_name?: string
  city?: string
  private_score_url?: string
}

const ContractorFallbackAnalysis = ({ company_name, city, private_score_url }: Props) => {
  const cn = company_name?.trim() || 'votre entreprise'
  const ville = city?.trim() || 'votre région'
  const url = private_score_url?.trim() || 'https://unpro.ca'

  return (
    <Html lang="fr-CA" dir="ltr">
      <Head />
      <Preview>Votre entreprise est-elle prête pour les recommandations IA ?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Votre entreprise est-elle prête pour les recommandations IA ?</Heading>
          <Text style={text}>Bonjour {cn},</Text>
          <Text style={text}>
            Nous analysons actuellement les entreprises de {ville} afin d'améliorer les recommandations
            faites aux propriétaires.
          </Text>
          <Text style={text}>Votre profil est-il à jour ?</Text>
          <Section style={ctaSection}>
            <Button href={url} style={button}>Voir mon analyse</Button>
          </Section>
          <Text style={small}>
            Ou copiez ce lien : <Link href={url} style={link}>{url}</Link>
          </Text>
          <Text style={signature}>— Alex<br />UNPRO</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContractorFallbackAnalysis,
  subject: 'Votre entreprise est-elle prête pour les recommandations IA ?',
  displayName: 'Contractor Fallback Analysis (FR-CA)',
  previewData: {
    company_name: 'Plomberie Express',
    city: 'Laval',
    private_score_url: 'https://unpro.ca/analyse/exemple',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { color: '#0f172a', fontSize: '22px', lineHeight: '1.35', fontWeight: 600, margin: '0 0 24px' }
const text = { color: '#1e293b', fontSize: '15px', lineHeight: '1.65', margin: '0 0 14px' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const small = { color: '#475569', fontSize: '12px', lineHeight: '1.5', margin: '8px 0 24px' }
const link = { color: '#0f172a', textDecoration: 'underline' }
const signature = { color: '#475569', fontSize: '14px', lineHeight: '1.5', marginTop: '24px' }
