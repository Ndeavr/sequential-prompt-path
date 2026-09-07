/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { UNPRO_EMAIL_LOGO_HEIGHT, UNPRO_EMAIL_LOGO_URL, UNPRO_EMAIL_LOGO_WIDTH } from './brand-assets.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous êtes invité à rejoindre {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={UNPRO_EMAIL_LOGO_URL} alt="UNPRO" width={UNPRO_EMAIL_LOGO_WIDTH} height={UNPRO_EMAIL_LOGO_HEIGHT} style={logo} />
        <Heading style={h1}>Vous êtes invité</Heading>
        <Text style={text}>
          Vous avez été invité à rejoindre{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
          . Cliquez sur le bouton ci-dessous pour accepter l'invitation.
        </Text>
        <Button style={button} href={confirmationUrl}>Accepter l'invitation</Button>
        <Text style={footer}>
          Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce courriel.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px 32px', maxWidth: '520px', margin: '0 auto' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(222, 100%, 61%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(222, 100%, 61%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
