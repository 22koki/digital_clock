# Devtime 2.0 — setup and rollout

## What is included
- Rule-based smart schedule planning with preview, break insertion, weekdays, conflict checks and explicit confirmation.
- Account-ready optional Supabase email/password authentication.
- Revision-checked upload/download of private cloud snapshots, with local JSON backup before replacing browser data.
- Continued local-only operation when no cloud credentials exist.
- Responsive layout and automated testing for the new engine.

## Important: the cloud is not provisioned

There is **no dedicated Supabase project** associated with this Devtime repository yet. Do not use your other projects or their data.

1. Create a **new dedicated Supabase project** for Devtime after confirming its cost.
2. In that project's SQL editor, review and run `supabase/migrations/devtime_workspaces.sql`.
3. Verify RLS policies, authenticated read/write and denial of cross-account access before allowing real users.
4. Add only that project's **public URL** and **publishable key** to `cloud-config.js`. **Never** commit secret/service-role keys.
5. In Authentication → URL Configuration, configure the production GitHub Pages URL and auth redirect allowlist.
6. Test signup, confirmation, login, logout, cloud upload, download, stale revision conflicts, data backups and privacy with **two distinct test accounts**.
7. Only then promote this branch to the public site.

**Current limitations:** Cloud backup and restore are explicit manual actions, not automatic multi-device synchronization. The cloud setup is a gated beta feature, not deployed production authentication. Do not use production user data in the beta.

## Smart planner
Tasks use `Task name | minutes | category`. The planner looks for available non-overlapping slots inside your working hours and can insert short breaks. It never edits the existing schedule. Any tasks that do not fit appear as unplaced.

## Reliability and product rollout
Run the Node unit tests and Playwright viewport tests in GitHub Actions. Test with the browser offline and verify existing local data survives an upgrade. Once the cloud setup is validated, add onboarding, cross-account isolation tests and a public beta checklist.
