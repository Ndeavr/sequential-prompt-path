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
import { template as bookingConfirmationContractor } from './booking-confirmation-contractor.tsx'
import { template as paymentSuccess } from './payment-success.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as entrepreneurWelcome } from './entrepreneur-welcome.tsx'
import { template as contractorProfileActivated } from './contractor-profile-activated.tsx'
import { template as noResponseFollowup } from './no-response-followup.tsx'
import { template as incompleteCheckoutFollowup } from './incomplete-checkout-followup.tsx'
import { template as prospectOutreach } from './prospect-outreach.tsx'
import { template as manualLiveTest } from './manual-live-test.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-comment': contactComment,
  'booking-confirmation': bookingConfirmation,
  'booking-confirmation-contractor': bookingConfirmationContractor,
  'payment-success': paymentSuccess,
  'payment-failed': paymentFailed,
  'entrepreneur-welcome': entrepreneurWelcome,
  'contractor-profile-activated': contractorProfileActivated,
  'no-response-followup': noResponseFollowup,
  'incomplete-checkout-followup': incompleteCheckoutFollowup,
  'prospect-outreach': prospectOutreach,
  'manual-live-test': manualLiveTest,
}
