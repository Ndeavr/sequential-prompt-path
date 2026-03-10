# UNPRO — Verification Checklist

> Use this checklist after running each build prompt to verify everything works correctly.

## After 01-Foundation
- [ ] Database tables created in Lovable Cloud
- [ ] RLS policies active (test with different roles)
- [ ] Auth signup creates profile record
- [ ] Auth login returns correct session
- [ ] Role assignment works (homeowner, contractor, admin)
- [ ] Storage buckets created and accessible
- [ ] All routes render without errors
- [ ] Protected routes redirect unauthenticated users
- [ ] No console errors on any page

## After 02-Build
- [ ] Landing page renders with all sections
- [ ] Contractor directory loads and filters work
- [ ] Dashboard displays user-specific data
- [ ] Quote upload form submits successfully
- [ ] Quote analysis returns results
- [ ] Home Score page displays property data
- [ ] AIPP Score page shows score breakdown
- [ ] Contractor profile page loads public data
- [ ] Admin panel accessible only to admins
- [ ] All forms validate input correctly
- [ ] Mobile layout works on all pages
- [ ] Navigation between pages works smoothly

## After 03-Fix (if needed)
- [ ] Previously failing items now pass
- [ ] No new regressions introduced
- [ ] Console errors resolved
- [ ] Network requests returning expected data
