# System design learnings

Same decisions as `architecture-notes.md`, stated as lessons that transfer. A learning here is an invariant, the mechanism that holds it, and the failure you get when a later change breaks it.

Ledgerline is a small system: Next.js, Express, Postgres, a Gmail worker, a Telegram client. The lessons are about ledgers, ingestion, and tenancy. They show up in any system that imports untrusted events and then shows a derived view.

## 1. Keep the event. Compute the meaning.

**Invariant.** The stored row is what the source posted. Spend, investment, a friend's share, a refund, and money that only passed through are interpretations applied when someone reads.

**Mechanism.** The debit amount is never rewritten by a split. Shares, category, and classification source sit beside it. Overview has no saved monthly total. One function drops passed-on and investments, subtracts refunds, and counts your share.

**Breaks when.** A dashboard writes its conclusion back onto the event. The next interpretation has nothing honest left to read, and a correction cannot flow to every screen because some screen cached the old conclusion.

## 2. An automated writer yields to an explicit human write.

**Invariant.** A guess may fill an empty label. A label a person set is not replaced by a later guess. A rule may teach other unlabeled rows. It stops at rows a person already touched.

**Mechanism.** Each row stores a classification source: parser, brand catalog, amount band, mail alert, rule, user, or Telegram. User and Telegram sources are sticky in the chart resolver. Reclassification skips `user_override`. Applying a correction forward inserts a rule keyed by UPI id or narration.

**Breaks when.** Every import is treated as a fresher truth. The user's correction lasts until the next scan, which is the same bug as a crawler overwriting an editor.

## 3. Give shared facts and tenant facts different lifetimes.

**Invariant.** A brand is reference data. A person, a rule, and a ledger row are tenant data. Reference data may be global. Tenant data is keyed by user and is what an account delete removes.

**Mechanism.** Categories and providers are either global (`user_id` null) or private. People are rules on that user, with a block tag so one UPI id can be detached without deleting the person or the bank rows. Sign-in is an allowlist plus invite codes.

**Breaks when.** One table holds both, distinguished by a flag the next query forgets. A shared catalog update rewrites someone's landlord, or a public dump includes someone's month.

## 4. Normalize untrusted text. Retain the raw text.

**Invariant.** Display identity is a structured extraction. The source string remains available and is not used as a primary key.

**Mechanism.** Alert parsing pulls the VPA and the party name out of the bank template. If the stored merchant is only the account bank, resolution substitutes the counterparty. The narration stays on the row.

**Breaks when.** The notification subject becomes the merchant. Every aggregate collapses to the sender of the alert.

## 5. Two feeds of the same world are a reconciliation, not a merge race.

**Invariant.** One feed is allowed to create the ledger. The second feed is evidence. Disagreement is a review. Agreement labels existing rows. New money from the second feed is an explicit import.

**Mechanism.** Allowlisted bank mail creates transactions. Statement lines live in their own table. Approving a vendor UPI id labels ledger rows that already carry it, including months outside the PDF. Match logic does not silently insert spend. The Gmail query repeats `from:` per sender, because `from:(a OR b)` is parsed as `from:a OR b` and matches the mailbox.

**Breaks when.** Whichever parser finishes last wins, or a search filter is wider than the documents you meant to read.

## 6. Idempotency keys have to survive a second source, and they have to leave room for a real new row.

**Invariant.** Re-running import does not double a payment. A row that did not come from the bank is not dropped because it resembles one that did. The audit copy and the ledger copy may both exist.

**Mechanism.** A transaction fingerprint is a hash of date, type, amount, UPI id, and normalized narration, unique per user. Statement lines have a separate fingerprint. A hand-entered expense uses a random fingerprint (`manual:<uuid>`), so it cannot collide with a bank line and cannot be deduped away.

**Breaks when.** The key is only the mail provider's message id. The PDF has no message id, so the payment is inserted again. Or the key is only the amount, so a cash dinner is discarded as a duplicate of a card dinner.

## 7. Store a secret for as long as the job that needs it.

**Invariant.** A credential lives exactly as long as the capability it unlocks. A one-shot file open does not become a stored secret. A repeated remote session does, and then it is encrypted, and known defaults are refused at boot.

**Mechanism.** PDF uploads stay in memory. The statement password is request input and is not a column. Gmail refresh tokens are stored as AES-GCM ciphertext because the worker must scan again. Anonymous parse-without-save is off unless explicitly enabled, and the production check fails if that switch is on.

**Breaks when.** Every secret is either kept forever "just in case" or dropped, including the one the next job needs.

## 8. Pick one civil clock and use it on every boundary.

**Invariant.** A domain day means the same date in storage, in the mail query, in the chart, and in a scheduled message.

**Mechanism.** A date with no time is midnight in IST. Gmail `after:` / `before:` bounds are built from those days. Telegram reminders are minutes after midnight IST. Category nudges stay quiet from 02:00 to 10:00 IST.

**Breaks when.** Each layer calls `toISOString()` and slices a UTC day. A payment just after midnight in India lands on the previous chart day, and the reminder fires in the middle of the night.

## 9. Long work leaves the request. Status must not be cached into a lie.

**Invariant.** A user click acknowledges a job. It does not hold an upstream connection for the whole job. Clients that poll status must observe a new body when the job moves.

**Mechanism.** The API serves the product. A worker process scans mail and sends reminders. The browser polls. ETags are disabled because a 304 replayed "still running" after the scan had finished. One scan accepts at most two banks, which bounds the job to the accounts the user named.

**Breaks when.** The request handler is the worker, so a slow mailbox ties up a web process. Or the status route is cacheable, so the UI converges on a stale phase.

## 10. Every client writes the same model.

**Invariant.** A new surface is another entry point. It does not get a second copy of the month, a second notion of "the user fixed this," or a second authorization story.

**Mechanism.** Telegram reads and writes the same ledger. Phone proof is the chat Telegram associates with that number. A label from the chat is stored as a Telegram classification, which the chart treats as a human write. Sync updates one message.

**Breaks when.** The bot keeps its own totals, or "linked" means anyone who can type the email. The phone and the web then disagree, and you have two systems to reconcile.

## 11. Ship the capability you can name. Put the extension point behind it.

**Invariant.** A pluggable boundary is honest only if the product claims the implementations that exist. The seam can be wider than the current plugin. The user-facing contract matches the plugin.

**Mechanism.** Statement text goes through adapters with detect, extract, and a balance chain. The PDF adapter recognizes HDFC-style columns, and the screen says so. Mail is a separate parser: sender allowlists and alert templates. Two banks on a scan is a mail feature, not a claim that every bank PDF parses.

**Breaks when.** The interface is treated as a launched integration. Users send a format `detect` rejects, and the failure looks like a bug in a feature you advertised.

## 12. Test the port. Remember the fake is not the database.

**Invariant.** Domain behavior is tested through the same store interface production uses. The in-memory implementation is allowed to skip real SQL. It is not evidence that a migration is correct.

**Mechanism.** `DATABASE_URL=memory` selects an in-memory store with the same methods. The Express app is built by a function that does not bind a port. Classification and month math run on that path.

**Breaks when.** Tests talk to a simplified mock that does not match the interface, so they pass while the API and the store disagree. Or the memory twin is treated as proof that a SQL-only migration behaves.

---

## How to use them

One learning is one piece. Open with the invariant, in one sentence, before any Ledgerline detail. The mechanism is the proof that you actually did it. The break is the ending: the bug a viewer has already shipped.

| Piece | Learning |
| --- | --- |
| A ledger versus a dashboard | 1 |
| Human edits versus crawlers | 2 |
| Multi-tenant reference data | 3 |
| Parsing notifications | 4 |
| Two sources of the same events | 5 |
| Idempotent import | 6 |
| Secret lifetime | 7 |
| Timezones | 8 |
| Jobs, polling, and cache | 9 |
| A second client | 10 |
| Plugin boundaries | 11 |
| Fakes in tests | 12 |

A system-design walkthrough of the whole app is 1, then 5, then 6, then 2. That is the spine: events in, identity stable, meaning computed, humans sticky.
