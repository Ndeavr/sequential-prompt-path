import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface Props {
  first_name?: string
  channel_used?: string
  phone_type?: string
}

const RouterSmokeTestEmail = ({ first_name, channel_used, phone_type }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>UNPRO — Test du Smart Contact Router</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Test de routage réussi</Heading>
        <Text style={text}>
          {first_name ? `Bonjour ${first_name},` : 'Bonjour,'} ce courriel confirme que le
          Smart Contact Router de {SITE_NAME} fonctionne correctement.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Canal utilisé :</strong> {channel_used ?? 'email'}</Text>
          <Text style={kv}><strong>Type de téléphone détecté :</strong> {phone_type ?? 'non applicable'}</Text>
          <Text style={kv}><strong>Provider :</strong> Lovable Email</Text>
        </Section>
        <Text style={footer}>— Équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RouterSmokeTestEmail,
  subject: 'UNPRO — Test de routage Smart Router',
  displayName: 'Smart Router — Smoke test',
  previewData: { first_name: 'Test', channel_used: 'email', phone_type: 'mobile' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }
const card = { background: '#f6f8fb', borderRadius: '14px', padding: '18px 20px', margin: '0 0 24px' }
const kv = { fontSize: '13px', color: '#1f2937', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
