import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface ManualLiveTestProps {
  subject?: string
  body?: string
}

const ManualLiveTestEmail = ({ subject, body }: ManualLiveTestProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{subject || 'Test live UNPRO'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{subject || 'Test live UNPRO'}</Heading>
        <Text style={text}>{body || 'Ceci est un test d’envoi live UNPRO.'}</Text>
        <Text style={footer}>Envoyé via {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ManualLiveTestEmail,
  subject: ({ subject }: Record<string, any>) => subject || 'Test live UNPRO',
  displayName: 'Manual live test',
  previewData: { subject: 'Test live UNPRO', body: 'Ceci est un test de production.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0F172A', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.7', margin: '0 0 24px', whiteSpace: 'pre-line' as const }
const footer = { fontSize: '12px', color: '#64748B', margin: '28px 0 0' }