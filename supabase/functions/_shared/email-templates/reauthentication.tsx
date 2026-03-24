/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://clmaqdnphbndvmmqvpff.supabase.co/storage/v1/object/public/email-assets/unpro-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="UNPRO" width="48" height="48" style={logo} />
        <Heading style={h1}>Confirmer votre identité</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expirera sous peu. Si vous n'avez pas fait cette demande, vous pouvez ignorer ce courriel.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px 32px', maxWidth: '520px', margin: '0 auto' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: "'Space Grotesk', Courier, monospace", fontSize: '28px', fontWeight: 'bold' as const, color: 'hsl(222, 100%, 61%)', margin: '0 0 30px', letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
