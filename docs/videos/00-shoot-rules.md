# Shared shoot rules

Hand Codex one video file at a time. Capture the browser only. Devansh records the voice later, or Codex can leave silent clips and Devansh lays the lines in the edit.

App: Ledgerline at http://localhost:3000. Signed in. Sidebar visible. Browser zoom 100%. A month that already has real payments.

## Before every clip

1. API on port 4000, web on port 3000.
2. Close mail, bank sites, this repo, and any tab that shows `.env`.
3. Pick a month with a few debits, one daily limit, and at least one person on People.
4. Gmail is already connected. Email alerts for transactions are already on in the bank app. Do not connect a new Google account on camera.
5. Do not start a live mail scan, upload a statement, or type a PDF password unless that video says to.
6. When a clip talks about bank mail, say that people trying Ledgerline have to turn on email alerts for transactions in the bank app. If those mails are off, a scan has nothing to import.

## Never on screen or in the voice

- `.env`, tokens, the database URL, account numbers
- A full UPI id spoken out loud. The chip can sit on screen. The voice says "that id" or the person's first name.
- Someone else's Gmail
- The delete-account control, except to leave it alone
- **Clear imported data**. Do not click it.

## How to move

- One click, then hold still for the line under it.
- Scroll slowly. Stop when the named heading is fully in frame.
- If a screen is empty, switch to a month that has data. Do not debug on camera.
- Cursor stays near the control being talked about. Do not wander.

## If something breaks

| What happened | Do this |
| --- | --- |
| Overview is empty | Switch the month. Do not open Gmail. |
| A chart looks wrong | Leave it. Fix the label after the shoot. |
| A confirm dialog appears | Cancel it, unless the script asked for that click. |
