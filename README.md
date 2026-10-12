# Devtime ⏱️

**Make time to build.** A developer-first coding schedule planner with a focus countdown, editable time blocks and daily progress analytics.

Built using **HTML, CSS and vanilla JavaScript**. Zero dependencies. Fully responsive, and ready for GitHub Pages.

## What it does

- **Plan your day:** Add, edit, complete, and remove coding blocks, debugging sessions, learning, reviews, planning and breaks.
- **Focus timer:** Select any scheduled block, start/pause/reset a countdown and mark the block complete. Running time contributes to focused-minutes stats.
- **Visual daily timeline:** See a compact snapshot of your day, planned focus hours, completed blocks and progress.
- **Date navigation:** Move between days to prepare your work schedule in advance.
- **Quick add:** Schedule a 50-minute coding session, 30-minute debug session or 10-minute break.
- **Avoid overlaps:** Conflicting blocks and cross-midnight schedules are rejected.
- **Export:** Save the selected date's plan as a CSV.
- **Local persistence:** Schedules are stored in the browser using `localStorage`.
- **Notifications:** Optional browser notifications and an audio cue when the active tab's timer finishes.
- **Theme toggle:** Two visual themes.

## Run locally

Clone this repository and open `index.html` in a modern browser. No installation or build required.

Optional local server using Python:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

On Windows with restricted PowerShell scripts, simply opening `index.html` is enough.

## GitHub Pages

1. Open **Settings → Pages** in this GitHub repository.
2. Set **Build and deployment → Deploy from a branch**.
3. Select **main**, folder **/(root)**, and **Save**.

After deployment, the site will be available at:

https://22koki.github.io/digital_clock/

## How a coding day works

1. Choose the work day in **Today's game plan**.
2. Add blocks with a start time, a duration, task name and optional notes.
3. Click the **play** button on a block to load its timer.
4. Press **Start session**, or pause/reset when needed.
5. Mark the block complete when finished. Check the updated stats.

A starter schedule appears for the first visit. Edit the example blocks or use **Clear sample** to start fresh.

> **Data and timer note:** This MVP stores data *per browser/device*, not in a remote database, and browser notifications require permission. Timers are paused safely when you leave the page; keep the tab open while working. The tool does not sync with Google Calendar, Jira, or GitHub issues.

## Roadmap

- Task linking to GitHub issues and pull requests
- Reusable daily/weekly templates
- Optional local reminders before scheduled blocks
- Weekly productivity insights and calendar export
- Opt-in synchronization across devices

## Project structure

```text
index.html   # semantic UI and dialogs
styles.css   # responsive dashboard styling
app.js       # planner, timer, persistent state and exports
favicon.svg  # simple project icon
```

Made for developers who want intentional time, fewer distractions, and more shipped work.
