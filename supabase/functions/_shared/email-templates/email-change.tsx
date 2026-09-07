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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre changement de courriel pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={UNPRO_EMAIL_LOGO_URL} alt="UNPRO" width={UNPRO_EMAIL_LOGO_WIDTH} height={UNPRO_EMAIL_LOGO_HEIGHT} style={logo} />
        <Heading style={h1}>Confirmer le changement de courriel</Heading>
        <Text style={text}>
          Vous avez demandé à changer votre adresse courriel pour {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> à{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Cliquez sur le bouton ci-dessous pour confirmer ce changement :</Text>
        <Button style={button} href={confirmationUrl}>Confirmer le changement</Button>
        <Text style={footer}>
          Si vous n'avez pas demandé ce changement, veuillez sécuriser votre compte immédiatement.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px 32px', maxWidth: '520px', margin: '0 auto' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(222, 100%, 61%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(222, 100%, 61%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
