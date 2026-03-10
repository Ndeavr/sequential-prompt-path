# UNPRO — Launch Checklist

> Pre-launch verification checklist to ensure the platform is ready for production.

## Infrastructure
- [ ] Lovable Cloud enabled and configured
- [ ] Custom domain connected
- [ ] SSL certificate active
- [ ] Environment variables set (see `/config/env-template.md`)

## Authentication
- [ ] Email/password signup and login working
- [ ] Google OAuth configured and working
- [ ] Role assignment on signup (homeowner/contractor)
- [ ] Password reset flow functional
- [ ] Session persistence verified

## Database
- [ ] All tables created and migrations applied
- [ ] RLS policies enabled on all tables
- [ ] Security definer functions deployed
- [ ] Seed data removed or replaced with production data

## Payments
- [ ] Stripe integration connected
- [ ] Subscription plans configured
- [ ] Webhook endpoint verified
- [ ] Test transactions completed

## Features
- [ ] Quote upload and analysis working
- [ ] Home Score calculation functional
- [ ] AIPP Score display accurate
- [ ] Contractor profiles publicly accessible
- [ ] Admin panel operational

## Performance
- [ ] Page load times under 3 seconds
- [ ] Images optimized and lazy loaded
- [ ] Mobile responsive on all pages

## Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
