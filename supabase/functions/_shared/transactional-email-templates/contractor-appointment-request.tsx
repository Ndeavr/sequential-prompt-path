/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  contractorName?: string
  projectLabel?: string
  city?: string
  preferredDate?: string
  timeWindow?: string
  acceptUrl?: string
  proposeUrl?: string
  declineUrl?: string
}

const Email = ({
  contractorName, projectLabel, city, preferredDate, timeWindow, acceptUrl, proposeUrl, declineUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouvelle demande de rendez-vous UNPRO — répondez en un clic</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>UNPRO</Text>
        <Heading style={h1}>Nouvelle demande de rendez-vous</Heading>
        <Text style={text}>
          Bonjour {contractorName || 'entrepreneur'}, un propriétaire souhaite vous rencontrer. Cette demande vous est réservée : elle n'est pas partagée avec d'autres entrepreneurs.
        </Text>
        <Section style={box}>
          {projectLabel ? <Text style={row}><b>Projet :</b> {projectLabel}</Text> : null}
          {city ? <Text style={row}><b>Ville :</b> {city}</Text> : null}
          {preferredDate ? <Text style={row}><b>Date souhaitée :</b> {preferredDate}</Text> : null}
          {timeWindow ? <Text style={row}><b>Plage :</b> {timeWindow}</Text> : null}
        </Section>
        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button style={primary} href={acceptUrl}>Accepter</Button>
        </Section>
        <Section style={{ textAlign: 'center', margin: '8px 0' }}>
          <Button style={secondary} href={proposeUrl}>Proposer d'autres plages</Button>
        </Section>
        <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
          <Button style={ghost} href={declineUrl}>Refuser</Button>
        </Section>
        <Text style={small}>Ces liens sont personnels et expirent dans 7 jours.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Nouvelle demande de rendez-vous UNPRO',
  displayName: 'Demande de rendez-vous (entrepreneur)',
  previewData: {
    contractorName: 'Toiture Exemple',
    projectLabel: 'Réfection de toiture',
    city: 'Laval',
    preferredDate: '2026-10-02',
    timeWindow: 'Matin',
    acceptUrl: 'https://unpro.ca/rdv/exemple',
    proposeUrl: 'https://unpro.ca/rdv/exemple',
    declineUrl: 'https://unpro.ca/rdv/exemple',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 24px', maxWidth: '520px' }
const logo = { fontSize: '18px', fontWeight: 800, color: '#0B1B3A', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0B1B3A', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#1f2937' }
const box = { backgroundColor: '#F4F6FA', borderRadius: '14px', padding: '12px 16px' }
const row = { fontSize: '14px', color: '#1f2937', margin: '4px 0' }
const btn = { borderRadius: '14px', padding: '12px 22px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const primary = { ...btn, backgroundColor: '#1D4ED8', color: '#ffffff' }
const secondary = { ...btn, backgroundColor: '#ffffff', color: '#1D4ED8', border: '1px solid #1D4ED8' }
const ghost = { ...btn, backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid #d1d5db' }
const small = { fontSize: '12px', color: '#6b7280' }
