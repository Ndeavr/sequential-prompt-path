# Prompt 01 — Foundation

> This prompt is responsible for generating the foundational infrastructure of the UNPRO application.

## What This Prompt Generates

- **Database Schema** — All Supabase tables, columns, types, indexes, enums, and relations
- **Authentication System** — User signup/login, role assignment (homeowner, contractor, admin), session management
- **Storage Buckets** — File storage for contractor documents, property photos, inspection reports
- **Route Structure** — Public routes, dashboard routes, pro routes, admin routes
- **Component Architecture** — Layout components, shared UI components, page-level components

## Prerequisites

- Lovable Cloud must be enabled
- GitHub repository must be connected

## Expected Output

After running this prompt, the application should have:
1. A fully defined database schema deployed to Lovable Cloud
2. Working authentication with role-based access
3. Storage buckets configured with appropriate RLS policies
4. All routes defined and protected by role
5. Base layout components rendering correctly

---

_Run this prompt first before proceeding to 02-build._
