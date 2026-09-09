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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { UNPRO_EMAIL_LOGO_HEIGHT, UNPRO_EMAIL_LOGO_URL, UNPRO_EMAIL_LOGO_WIDTH } from './brand-assets.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre courriel pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={UNPRO_EMAIL_LOGO_URL} alt="UNPRO" width={UNPRO_EMAIL_LOGO_WIDTH} height={UNPRO_EMAIL_LOGO_HEIGHT} style={logo} />
        <Heading style={h1}>Confirmez votre courriel</Heading>
        <Text style={text}>
          Merci de vous être inscrit sur <strong>{siteName}</strong> !
        </Text>
        <Text style={text}>
          Veuillez confirmer votre adresse courriel ({recipient}) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Vérifier mon courriel
        </Button>
        {token ? (
          <>
            <Text style={text}>Ou entrez ce code sur la page&nbsp;:</Text>
            <Text style={code}>{token}</Text>
          </>
        ) : null}
        <Text style={footer}>
          Si vous n'avez pas créé de compte, vous pouvez ignorer ce courriel.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Manrope', Arial, sans-serif" }
const container = { padding: '28px 32px', maxWidth: '520px', margin: '0 auto' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: 'hsl(222, 100%, 61%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
const code = { fontSize: '30px', fontWeight: 'bold' as const, letterSpacing: '6px', color: '#0f172a', margin: '8px 0 4px' }
