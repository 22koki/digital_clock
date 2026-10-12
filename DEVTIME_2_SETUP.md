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

## Dedicated Devtime backend (2026-10-12)
- Supabase project: `znkgwcbifsqwtbjnqzdd` (EU Central).
- Workspace migration was applied to this dedicated project. RLS is enabled; four owner-scoped policies exist. The security advisor reported no findings.
- The repository's `cloud-config.js` now uses the dedicated project URL and **public publishable** API key, not a secret key.
- The prior Koki and Riverstone projects were not modified.

### Required dashboard Auth configuration
Open [Devtime Auth URL Configuration](https://supabase.com/dashboard/project/znkgwcbifsqwtbjnqzdd/auth/url-configuration).
Set:
- **Site URL:** `https://22koki.github.io/digital_clock/`
- **Redirect URL allowlist:** `https://22koki.github.io/digital_clock/` (add local development URLs only when needed).

Check [Email provider settings](https://supabase.com/dashboard/project/znkgwcbifsqwtbjnqzdd/auth/providers) and verify email/password authentication and confirmation email behavior. Confirmation emails must redirect to the permitted GitHub Pages URL.

### Acceptance test with your own login
1. Export a local Devtime JSON backup first.
2. Open the live GitHub Pages site, choose **Local only / Sync available** account button, and create your Devtime account using your own email.
3. Confirm your email if prompted, sign in, and explicitly **Upload local workspace**.
4. Use a different browser or private window, sign in to the **same account**, and choose **Download cloud workspace**. Verify that schedule, projects, notes and saved routines are present.
5. Sign out, verify local work remains present, and sign in again.
6. Test with another distinct account before making a public beta claim; verify that it cannot read, edit or overwrite the first user's private workspace.

**Important:** Cloud sync currently works by explicit manual upload/download. It is not continuous live sync or automatic account-isolated local storage. Do not use a shared device with sensitive data unless the browser profile is separate. Browser-side sign-out leaves local data available on that device. These limitations must be addressed before public rollout.
