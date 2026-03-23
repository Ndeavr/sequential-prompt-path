/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UNPRO'

interface ContactCommentProps {
  message?: string
  page?: string
}

const ContactCommentEmail = ({ message, page }: ContactCommentProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau commentaire depuis unpro.ca</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau commentaire</Heading>
        <Text style={label}>Message :</Text>
        <Text style={messageBox}>{message || '(aucun message)'}</Text>
        {page && (
          <Text style={meta}>Page : {page}</Text>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          Ce message a été envoyé depuis le popup d'aide sur {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactCommentEmail,
  subject: 'Nouveau commentaire depuis unpro.ca',
  displayName: 'Contact comment (popup)',
  to: 'dde@unpro.ca',
  previewData: { message: 'Bonjour, j\'aimerais en savoir plus sur vos services.', page: '/' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#1a1f36', margin: '0 0 20px' }
const label = { fontSize: '13px', fontWeight: '600' as const, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const messageBox = { fontSize: '15px', color: '#1a1f36', lineHeight: '1.6', backgroundColor: '#f5f6fa', padding: '16px', borderRadius: '8px', margin: '0 0 16px', border: '1px solid #e5e7eb' }
const meta = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
