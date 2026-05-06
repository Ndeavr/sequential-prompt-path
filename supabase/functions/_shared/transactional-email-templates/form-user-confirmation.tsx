/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface Props {
  firstName?: string
  formLabel?: string
  referenceCode?: string
}

const FormUserConfirmation = ({ firstName, formLabel, referenceCode }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande {SITE_NAME} a bien été reçue</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Merci, ${firstName}` : 'Merci pour votre demande'}
        </Heading>
        <Text style={text}>
          Nous avons bien reçu votre demande{formLabel ? ` (${formLabel})` : ''}. Notre équipe vous contactera rapidement.
        </Text>
        {referenceCode && (
          <Section style={refBox}>
            <Text style={refLabel}>Référence</Text>
            <Text style={refCode}>{referenceCode}</Text>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FormUserConfirmation,
  subject: 'Votre demande UNPRO a bien été reçue',
  displayName: 'Form — confirmation utilisateur',
  previewData: { firstName: 'Jean', formLabel: 'Partenaire Certifié', referenceCode: 'UNP-PART-7K2X9A' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 24px' }
const refBox = { backgroundColor: '#F7F6F0', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', margin: '0 0 24px' }
const refLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#6B7280', margin: '0 0 4px' }
const refCode = { fontSize: '17px', fontWeight: '700' as const, color: '#0F172A', margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9CA3AF', margin: 0 }
