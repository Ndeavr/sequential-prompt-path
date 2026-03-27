/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactComment } from './contact-comment.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as paymentSuccess } from './payment-success.tsx'
import { template as entrepreneurWelcome } from './entrepreneur-welcome.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-comment': contactComment,
  'booking-confirmation': bookingConfirmation,
  'payment-success': paymentSuccess,
  'entrepreneur-welcome': entrepreneurWelcome,
}
