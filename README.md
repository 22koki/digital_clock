# Devtime ✳ — Developer Work Planner

> **Make time to build.** A developer-focused work scheduler combining project workspaces, weekly planning, a full-screen focus timer, meaningful time tracking and a coding journal.

![Status](https://img.shields.io/badge/status-active%20development-b3a0ff)
![Vanilla JS](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JavaScript-242037)
![Tests](https://github.com/22koki/digital_clock/actions/workflows/tests.yml/badge.svg)

## What's inside

### 🗓 Weekly visual planner
- A Monday-to-Sunday time-block view with drag-and-drop between days.
- Arrow controls for keyboard/touch accessibility, plus an edit dialog.
- Automatic conflict detection, duration limits and end-of-day validation.
- Daily, weekday and weekly recurrence (up to 12 occurrences each time).
- Existing day timeline, add/edit/delete controls and CSV schedule export.

### 🚑 Smart Schedule Rescue
- From immersive focus mode, preview an extra 10, 15, 30, 45 or 60 minutes.
- Upcoming blocks shift only when needed, preserving existing gaps and preventing overlaps.
- Review every change before applying. The engine refuses changes that exceed midnight or the per-session duration limit.

### 🗓 Reusable coding-day templates
- Four built-in routines: **Deep Work Day**, **Debug & Ship**, **Learn & Build** and **Balanced Builder**.
- Preview timing and choose the start date and first session start time.
- Apply to a single day or all weekdays in a selected week.
- Conflict-safe by default: blocks are never overwritten without explicit confirmation.
- Save any populated day as a custom reusable routine (up to 30 saved templates).
- Backups include user-created templates for transfer between browsers.

### 📊 Weekly Developer Report
- A beautifully styled weekly recap with true logged focus time, completed work, active days, project momentum, dated bug resolutions and coding-journal highlights.
- Browse earlier and upcoming weeks with the navigation controls.
- Download a standalone, printable **HTML report** and use its **Print / Save as PDF** button, export a daily stats **CSV**, or copy a Markdown summary.
- Weekly metrics exclude break sessions from focus time and do not misattribute undated bug resolutions.

### 🗂 Project workspaces
- Create, edit or delete named projects, choose an accent color and set focus goals.
- Attach any work session to a project, view completed work and total tracked time.
- Filter weekly calendar cards by project.
- Optionally link a public GitHub repository; import open *issues* as draft coding tasks via GitHub's unauthenticated public API. Requires an internet connection and is subject to API rate limits. Private repositories are not supported.

### ⏲ Focus studio
- Start, pause, reset or complete the selected session.
- Full-screen immersive timer with keyboard shortcut (Space).
- A generated ambient rain sound (Web Audio API), no sound downloads required.
- Extend a session by 15 minutes if the new duration does not overlap another block.
- Optional browser notifications, and a timer-completion sound. The page needs to remain open for reliable reminders.

### 📓 Developer's notebook & Debug Rescue
- A redesigned, illustrated journal with rich entry cards, search, mood tags, project links, reflections and an elegant writing dialog.
- Capture completed work, blockers and what comes next per coding session.
- Investigate bugs in the **Debug Rescue Desk**: symptoms, reproduction steps, hypotheses, chronological fix attempts and observations.
- Track each issue through investigating, on-hold and resolved statuses, with a saved resolution summary.
- Start a scheduled 15-minute debugging sprint and automatically load its focus timer.
- Debug cases and their experiments are included in JSON backups.
- Copy a daily standup to the clipboard, or download a text fallback.
- View a 7-day logged-time bar chart, active days and milestone achievements.
- Export all your work as a JSON backup, and restore it on another device.

### 📱 Offline and responsive
- Mobile-friendly layouts and horizontally scrollable weekly planner.
- Offline asset caching through a service worker on localhost and HTTPS.
- An installable web-app manifest where browser support permits.
- Browser-local data persistence without a backend or account.

## Run the app

No packages or build tools needed. Open \`index.html\` for the basic UI, or serve the project locally for offline / installable support:

\`\`\`bash
python -m http.server 8000
\`\`\`

Then go to http://localhost:8000.

For Windows machines with PowerShell npm execution restrictions, no npm installation is necessary. You can also use VS Code Live Server.

## Deploy on GitHub Pages

On GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**. When enabled, your website will be at:

**https://22koki.github.io/digital_clock/**

This is a suggested deployment URL; it will not work until Pages is enabled and deployed.

## Test

Requires Node.js 20+ only for automated testing, not for running the app.

\`\`\`bash
node --check app.js
node --check studio.js
node --check scheduler.js
node --test tests/*.test.cjs
\`\`\`

Tests also run in GitHub Actions on pushes and pull requests.

## How to use the coding planner

1. Open **Projects → New project**. Name your project and optionally add a public GitHub repository URL.
2. Use **Today's game plan** to schedule a block with duration, project and recurrence.
3. Use **Weekly planner** to move it to a different day, or edit its start and duration.
4. Click a block to load the countdown. Select **Enter immersive focus mode** to hide distractions.
5. Complete your session, use the **Coding journal** to record what you accomplished, and share your standup.
6. Review the insights for the week, then **Export backup** if you want to move your data between browsers.

On your first visit a sample day is created. Choose **Clear sample** in the day list when ready to start from scratch.

## File layout

| File | Purpose |
| --- | --- |
| \`index.html\` | Accessible semantic dashboard and dialogs |
| \`styles.css\` | Base desktop/mobile styling |
| \`studio.css\` | Calendar, project, analytics, focus and journal visual design |
| \`app.js\` | Core daily planner, timer, CSV and local persistence |
| \`scheduler.js\` | Standalone conflict, week, recurrence and project-metrics utilities |
| \`studio.js\` | Studio feature integration and UI actions |
| \`sw.js\` | Same-origin static offline asset caching |
| \`manifest.webmanifest\` | PWA metadata |
| \`tests/scheduler.test.cjs\` | Node-based scheduling regression tests |

## Data/privacy limitations

Everything in the schedule, journal and projects is stored on **this browser**, not on a cloud database. Clearing browser storage will delete the local work unless you've saved a backup. GitHub issue import accesses **public GitHub data only**, does not ask for a personal access token, and does not modify your GitHub repository. The timer uses the browser clock, and keeping the page open is recommended when you need alerts.

## Upcoming ideas

- Automatic break-aware rescheduling suggestions
- Reusable week templates
- Daily and weekly coding reports with additional filters
- Optional signed-in, multi-device sync
- GitHub OAuth integrations for private issues, commits and PRs
- Attach code snippets and images to journal entries with offline storage
- Better offline push notifications when a supported notification backend is available

Designed with care for developers who want to focus less on clock-watching and more on shipping useful work.
